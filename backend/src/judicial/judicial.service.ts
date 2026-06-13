import { ConflictException, Injectable } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateJudicialRequestDto } from './dto/create-judicial-request.dto'

@Injectable()
export class JudicialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    return this.prisma.judicialAccessRequest.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 100,
    })
  }

  async create(dto: CreateJudicialRequestDto, user: AuthenticatedUser, request: Request) {
    const existing = await this.prisma.judicialAccessRequest.findUnique({
      where: { requestReference: dto.requestReference },
    })

    if (existing) {
      throw new ConflictException('Cette référence de demande existe déjà')
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      const judicialRequest = await tx.judicialAccessRequest.create({
        data: {
          requestReference: dto.requestReference,
          legalBasisDescription: dto.legalBasisDescription,
          courtOrderReference: dto.courtOrderReference,
          requestedPublicCodes: dto.requestedPublicCodes,
          requestedBy: dto.requestedBy,
          comments: dto.comments,
          status: 'received',
          dpoValidationUserId: user.role === 'dpo' ? user.id : undefined,
        },
      })

      await tx.identityVaultAuditLog.create({
        data: {
          actorUserId: user.id,
          action: 'judicial_access.request_create',
          requestId: judicialRequest.id,
          ipAddress: request.ip,
          metadata: {
            requestReference: dto.requestReference,
            requestedPublicCodes: dto.requestedPublicCodes,
          },
        },
      })

      return judicialRequest
    })

    await this.auditService.log({
      actor: user,
      action: 'judicial_access.request_create',
      entityType: 'JudicialAccessRequest',
      entityId: created.id,
      request,
      metadata: {
        requestReference: dto.requestReference,
        requestedPublicCodeCount: dto.requestedPublicCodes.length,
      },
    })

    return created
  }
}

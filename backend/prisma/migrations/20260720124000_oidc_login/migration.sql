CREATE TABLE "public"."OidcLoginState" (
  "id" UUID NOT NULL,
  "stateHash" TEXT NOT NULL,
  "codeVerifier" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "returnTo" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OidcLoginState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OidcLoginState_stateHash_key" ON "public"."OidcLoginState"("stateHash");
CREATE INDEX "OidcLoginState_expiresAt_idx" ON "public"."OidcLoginState"("expiresAt");

-- CreateTable
CREATE TABLE "nicknames_pool" (
    "id" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar_emoji" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "currently_used_in" UUID,
    "reserved_until" TIMESTAMPTZ(6),
    "reserved_by_session" UUID,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "last_used" TIMESTAMPTZ(6),
    "gender" TEXT,
    "language_origin" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nicknames_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_id" TEXT NOT NULL,
    "creator_nickname" TEXT NOT NULL,
    "creator_real_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "host_token" TEXT NOT NULL,
    "session_pin" TEXT,
    "mode" TEXT,
    "max_participants" INTEGER,
    "constant_invite_token" TEXT,
    "expected_participants" INTEGER,
    "expected_participants_set_at" TIMESTAMPTZ(6),
    "checkpoint_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar_emoji" TEXT NOT NULL,
    "real_name" TEXT,
    "is_creator" BOOLEAN NOT NULL DEFAULT false,
    "auth_token" TEXT,
    "claimed_invite_id" UUID,
    "items_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "marked_not_coming" BOOLEAN NOT NULL DEFAULT false,
    "marked_not_coming_at" TIMESTAMPTZ(6),
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "invite_token" TEXT NOT NULL,
    "invite_number" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invite_type" TEXT NOT NULL DEFAULT 'named',
    "is_constant_link" BOOLEAN NOT NULL DEFAULT false,
    "slot_assignments" JSONB,
    "declined_by" JSONB,
    "claimed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nicknames_pool_nickname_key" ON "nicknames_pool"("nickname");

-- CreateIndex
CREATE INDEX "nicknames_pool_is_available_idx" ON "nicknames_pool"("is_available");

-- CreateIndex
CREATE INDEX "nicknames_pool_reserved_until_idx" ON "nicknames_pool"("reserved_until");

-- CreateIndex
CREATE INDEX "nicknames_pool_gender_idx" ON "nicknames_pool"("gender");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_id_key" ON "sessions"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_constant_invite_token_key" ON "sessions"("constant_invite_token");

-- CreateIndex
CREATE INDEX "sessions_session_id_idx" ON "sessions"("session_id");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_created_at_idx" ON "sessions"("created_at");

-- CreateIndex
CREATE INDEX "sessions_mode_idx" ON "sessions"("mode");

-- CreateIndex
CREATE INDEX "sessions_constant_invite_token_idx" ON "sessions"("constant_invite_token");

-- CreateIndex
CREATE INDEX "participants_session_id_idx" ON "participants"("session_id");

-- CreateIndex
CREATE INDEX "participants_auth_token_idx" ON "participants"("auth_token");

-- CreateIndex
CREATE INDEX "participants_left_at_idx" ON "participants"("left_at");

-- CreateIndex
CREATE INDEX "participants_claimed_invite_id_idx" ON "participants"("claimed_invite_id");

-- CreateIndex
CREATE INDEX "invites_invite_token_idx" ON "invites"("invite_token");

-- CreateIndex
CREATE INDEX "invites_status_idx" ON "invites"("status");

-- CreateIndex
CREATE INDEX "invites_invite_type_idx" ON "invites"("invite_type");

-- CreateIndex
CREATE INDEX "invites_is_constant_link_idx" ON "invites"("is_constant_link");

-- CreateIndex
CREATE UNIQUE INDEX "invites_session_id_invite_number_key" ON "invites"("session_id", "invite_number");

-- CreateIndex
CREATE UNIQUE INDEX "invites_session_id_invite_token_key" ON "invites"("session_id", "invite_token");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_claimed_invite_id_fkey" FOREIGN KEY ("claimed_invite_id") REFERENCES "invites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


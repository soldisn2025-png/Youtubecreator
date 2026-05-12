-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'generating', 'ready_for_review', 'rendering', 'approved', 'exported', 'uploaded_private', 'failed');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('photo', 'clip', 'intro_image', 'outro_image');

-- CreateEnum
CREATE TYPE "AssetValidationStatus" AS ENUM ('pending', 'valid', 'rejected');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('full_generation', 'scene_regeneration', 'draft_render', 'final_render', 'youtube_upload');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'complete', 'failed');

-- CreateEnum
CREATE TYPE "SceneStatus" AS ENUM ('idle', 'tts_pending', 'rendering', 'ready', 'locked', 'error', 'approved');

-- CreateEnum
CREATE TYPE "RenderType" AS ENUM ('draft', 'final');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('queued', 'uploading', 'uploaded', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "targetLengthMin" INTEGER NOT NULL DEFAULT 3,
    "callToAction" TEXT NOT NULL,
    "ttsVoice" TEXT NOT NULL DEFAULT 'nova',
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "outline" TEXT NOT NULL,
    "introAssetId" TEXT,
    "outroAssetId" TEXT,
    "finalApprovedAt" TIMESTAMP(3),
    "finalApprovedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "validationStatus" "AssetValidationStatus" NOT NULL DEFAULT 'pending',
    "validationError" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YoutubeResearch" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "results" JSONB NOT NULL,

    CONSTRAINT "YoutubeResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "sceneId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "claudePromptTokens" INTEGER,
    "claudeCompletionTokens" INTEGER,
    "ttsCharactersBilled" INTEGER,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedScript" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "generationJobId" TEXT,
    "hookOptions" JSONB NOT NULL,
    "fullNarrationText" TEXT NOT NULL,
    "missingAssetsAdvice" JSONB NOT NULL,
    "sensitivityWarnings" JSONB NOT NULL,
    "titleOptions" JSONB NOT NULL,
    "descriptionDraft" TEXT NOT NULL,
    "hashtags" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "sceneTitle" TEXT NOT NULL,
    "assetId" TEXT,
    "narrationText" TEXT NOT NULL,
    "captionText" TEXT NOT NULL,
    "ttsAudioR2Key" TEXT,
    "ttsAudioDurationSec" DOUBLE PRECISION,
    "renderedClipR2Key" TEXT,
    "status" "SceneStatus" NOT NULL DEFAULT 'idle',
    "generationId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneRevision" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "narrationText" TEXT NOT NULL,
    "captionText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "RenderType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "outputR2Key" TEXT,
    "errorMessage" TEXT,
    "durationSec" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "renderJobId" TEXT NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "titleOptions" JSONB NOT NULL,
    "descriptionText" TEXT NOT NULL,
    "hashtags" JSONB NOT NULL,
    "scriptText" TEXT NOT NULL,
    "missingAssetsChecklist" JSONB NOT NULL,
    "zipR2Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YoutubeConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "YoutubeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YoutubeUpload" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "youtubeVideoId" TEXT,
    "privacyStatus" TEXT NOT NULL DEFAULT 'private',
    "uploadStatus" "UploadStatus" NOT NULL DEFAULT 'queued',
    "errorMessage" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YoutubeUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Project_userId_status_idx" ON "Project"("userId", "status");

-- CreateIndex
CREATE INDEX "Asset_projectId_type_idx" ON "Asset"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "YoutubeResearch_keyword_key" ON "YoutubeResearch"("keyword");

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_status_idx" ON "GenerationJob"("projectId", "status");

-- CreateIndex
CREATE INDEX "GeneratedScript_projectId_version_idx" ON "GeneratedScript"("projectId", "version");

-- CreateIndex
CREATE INDEX "Scene_projectId_orderIndex_idx" ON "Scene"("projectId", "orderIndex");

-- CreateIndex
CREATE INDEX "RenderJob_projectId_status_idx" ON "RenderJob"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "YoutubeConnection_userId_key" ON "YoutubeConnection"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedScript" ADD CONSTRAINT "GeneratedScript_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "GeneratedScript"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneRevision" ADD CONSTRAINT "SceneRevision_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportPackage" ADD CONSTRAINT "ExportPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportPackage" ADD CONSTRAINT "ExportPackage_renderJobId_fkey" FOREIGN KEY ("renderJobId") REFERENCES "RenderJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YoutubeConnection" ADD CONSTRAINT "YoutubeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YoutubeUpload" ADD CONSTRAINT "YoutubeUpload_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YoutubeUpload" ADD CONSTRAINT "YoutubeUpload_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "ExportPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

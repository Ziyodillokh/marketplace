-- AlterTable: channel posts can carry a video (in addition to text/image)
ALTER TABLE "ChannelPost" ADD COLUMN "videoUrl" TEXT;

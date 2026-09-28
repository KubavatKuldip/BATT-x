-- AlterEnum
-- Add SUPER_ADMIN to the UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

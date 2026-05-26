-- Migration: Add comments and attachments JSONB columns to tasks table
-- Run this in your Supabase SQL Editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- 0001_extensions.sql
-- Enable required Postgres extensions before any table uses them.
create extension if not exists vector;
create extension if not exists pgcrypto;

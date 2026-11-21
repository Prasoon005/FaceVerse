-- 0008_late_and_score.sql
-- Late arrivals and a monthly deduction score (company norms set by admins).
-- * attendance_settings gains office start time, grace period and scoring rules.
-- * absence_reviews gains `kind`: a reason can be for an absence or for coming late.
-- Lateness is computed from check_in_at with the current settings (no extra column).

alter table attendance_settings
  add column if not exists work_start time not null default '09:30',
  add column if not exists late_grace_minutes int not null default 15
    check (late_grace_minutes between 0 and 240),
  add column if not exists score_base int not null default 100
    check (score_base between 1 and 1000),
  add column if not exists deduct_absent numeric(6,2) not null default 10
    check (deduct_absent >= 0),
  add column if not exists deduct_late numeric(6,2) not null default 2
    check (deduct_late >= 0),
  add column if not exists deduct_excused numeric(6,2) not null default 0
    check (deduct_excused >= 0),
  add column if not exists deduct_late_excused numeric(6,2) not null default 0
    check (deduct_late_excused >= 0);

alter table absence_reviews
  add column if not exists kind text not null default 'absence'
    check (kind in ('absence', 'late'));

-- CreateEnum
CREATE TYPE "match_result_enum" AS ENUM ('h-win', 'draw', 'a-win');

-- CreateEnum
CREATE TYPE "job_status_enum" AS ENUM ('pending', 'running', 'paused', 'completed', 'failed', 'rate_limited');

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "fixture_id" INTEGER,
    "match_date" DATE NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "league" VARCHAR(150) NOT NULL,
    "home_team" VARCHAR(100) NOT NULL,
    "away_team" VARCHAR(100) NOT NULL,
    "result" "match_result_enum",
    "home_goals" INTEGER DEFAULT 0,
    "away_goals" INTEGER DEFAULT 0,
    "home_shots" INTEGER DEFAULT 0,
    "home_shots_on_target" INTEGER DEFAULT 0,
    "away_shots" INTEGER DEFAULT 0,
    "away_shots_on_target" INTEGER DEFAULT 0,
    "home_corners" INTEGER DEFAULT 0,
    "away_corners" INTEGER DEFAULT 0,
    "home_offsides" INTEGER DEFAULT 0,
    "away_offsides" INTEGER DEFAULT 0,
    "home_y_cards" INTEGER DEFAULT 0,
    "away_y_cards" INTEGER DEFAULT 0,
    "home_r_cards" INTEGER DEFAULT 0,
    "away_r_cards" INTEGER DEFAULT 0,
    "home_possession" DECIMAL(5,2) DEFAULT 0.00,
    "away_possession" DECIMAL(5,2) DEFAULT 0.00,
    "home_fouls" INTEGER DEFAULT 0,
    "away_fouls" INTEGER DEFAULT 0,
    "home_odds" DECIMAL(6,2),
    "draw_odds" DECIMAL(6,2),
    "away_odds" DECIMAL(6,2),
    "standing_home" INTEGER,
    "standing_away" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "home_xg" DECIMAL(5,2),
    "away_xg" DECIMAL(5,2),
    "home_goals_ht" INTEGER DEFAULT 0,
    "away_goals_ht" INTEGER DEFAULT 0,
    "result_ht" VARCHAR(10),
    "is_finished" VARCHAR(3) DEFAULT 'yes',

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" SERIAL NOT NULL,
    "leagues" JSONB NOT NULL,
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "status" "job_status_enum" NOT NULL DEFAULT 'pending',
    "progress" JSONB DEFAULT '{}',
    "total_matches" INTEGER DEFAULT 0,
    "imported_matches" INTEGER DEFAULT 0,
    "failed_matches" INTEGER DEFAULT 0,
    "rate_limit_remaining" INTEGER DEFAULT 7500,
    "rate_limit_reset_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" BOOLEAN DEFAULT false,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matches_fixture_id_key" ON "matches"("fixture_id");

-- CreateIndex
CREATE INDEX "idx_matches_country_league" ON "matches"("country", "league");

-- CreateIndex
CREATE INDEX "idx_matches_created_at" ON "matches"("created_at");

-- CreateIndex
CREATE INDEX "idx_matches_date" ON "matches"("match_date");

-- CreateIndex
CREATE INDEX "idx_matches_teams" ON "matches"("home_team", "away_team");

-- CreateIndex
CREATE INDEX "idx_matches_fixture_id" ON "matches"("fixture_id");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs"("created_at" DESC);

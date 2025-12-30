-- Reorder columns in bets and coupons tables to match sheet order

-- Drop existing tables (with CASCADE to handle any foreign keys)
DROP TABLE IF EXISTS "bets" CASCADE;
DROP TABLE IF EXISTS "coupons" CASCADE;

-- Recreate bets table with correct column order (matching sheet columns A-AG)
CREATE TABLE "bets" (
    "id" SERIAL PRIMARY KEY,
    -- A-G: Basic match and bet info
    "home_team" VARCHAR(100) NOT NULL,              -- A
    "away_team" VARCHAR(100) NOT NULL,              -- B
    "bet_type" VARCHAR(50) NOT NULL,                -- C
    "bet_option" VARCHAR(50) NOT NULL,              -- D
    "szanse" VARCHAR(50),                           -- E
    "odds" DECIMAL(6,2),                            -- F
    "moc_bet" DECIMAL(8,2),                         -- G
    -- H-S: Statistics (5/10/15 matches, overall/h-a)
    "stat_5_h_overall" VARCHAR(50),                 -- H
    "stat_5_a_overall" VARCHAR(50),                 -- I
    "stat_5_h_ha" VARCHAR(50),                      -- J
    "stat_5_a_ha" VARCHAR(50),                      -- K
    "stat_10_h_overall" VARCHAR(50),                -- L
    "stat_10_a_overall" VARCHAR(50),                -- M
    "stat_10_h_ha" VARCHAR(50),                     -- N
    "stat_10_a_ha" VARCHAR(50),                     -- O
    "stat_15_h_overall" VARCHAR(50),                -- P
    "stat_15_a_overall" VARCHAR(50),                -- Q
    "stat_15_h_ha" VARCHAR(50),                     -- R
    "stat_15_a_ha" VARCHAR(50),                     -- S
    -- T-X: Results and standings
    "entered" VARCHAR(10),                          -- T
    "result_home" INTEGER,                          -- U
    "result_away" INTEGER,                          -- V
    "standing_home" INTEGER,                        -- W
    "standing_away" INTEGER,                        -- X
    -- Y-AB: Additional info
    "comment" TEXT,                                 -- Y
    "country" VARCHAR(100),                         -- Z
    "league" VARCHAR(150),                          -- AA
    "match_date" DATE,                              -- AB
    -- AC-AG: Links and ID
    "superbet_link" VARCHAR(500),                   -- AC/AF
    "match_id" INTEGER,                             -- AD
    "flashscore_link" VARCHAR(500),                 -- AG
    -- System fields
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for bets
CREATE INDEX "bets_match_id_idx" ON "bets"("match_id");
CREATE INDEX "bets_match_date_idx" ON "bets"("match_date");
CREATE INDEX "bets_created_at_idx" ON "bets"("created_at" DESC);

-- Recreate coupons table with correct column order (matching sheet columns A-AI)
CREATE TABLE "coupons" (
    "id" SERIAL PRIMARY KEY,
    -- A-G: Basic match and bet info
    "home_team" VARCHAR(100) NOT NULL,              -- A
    "away_team" VARCHAR(100) NOT NULL,              -- B
    "bet_type" VARCHAR(50) NOT NULL,                -- C
    "bet_option" VARCHAR(50) NOT NULL,              -- D
    "szanse" VARCHAR(50),                           -- E
    "odds" DECIMAL(6,2),                            -- F
    "moc_bet" DECIMAL(8,2),                         -- G
    -- H-S: Statistics (5/10/15 matches, overall/h-a)
    "stat_5_h_overall" VARCHAR(50),                 -- H
    "stat_5_a_overall" VARCHAR(50),                 -- I
    "stat_5_h_ha" VARCHAR(50),                      -- J
    "stat_5_a_ha" VARCHAR(50),                      -- K
    "stat_10_h_overall" VARCHAR(50),                -- L
    "stat_10_a_overall" VARCHAR(50),                -- M
    "stat_10_h_ha" VARCHAR(50),                     -- N
    "stat_10_a_ha" VARCHAR(50),                     -- O
    "stat_15_h_overall" VARCHAR(50),                -- P
    "stat_15_a_overall" VARCHAR(50),                -- Q
    "stat_15_h_ha" VARCHAR(50),                     -- R
    "stat_15_a_ha" VARCHAR(50),                     -- S
    -- T-X: Results and standings
    "entered" VARCHAR(10),                          -- T
    "result_home" INTEGER,                          -- U
    "result_away" INTEGER,                          -- V
    "standing_home" INTEGER,                        -- W
    "standing_away" INTEGER,                        -- X
    -- Y-AB: Additional info
    "comment" TEXT,                                 -- Y
    "country" VARCHAR(100),                         -- Z
    "league" VARCHAR(150),                          -- AA
    "match_date" DATE,                              -- AB
    -- AC-AG: Links and ID
    "superbet_link" VARCHAR(500),                   -- AC/AF
    "match_id" INTEGER,                             -- AD
    -- AE: Coupon specific
    "coupon_id" VARCHAR(20),                        -- AE
    "flashscore_link" VARCHAR(500),                 -- AG
    -- AH-AI: Financial
    "stake" DECIMAL(10,2),                          -- AH
    "potential_win" DECIMAL(10,2),                  -- AI
    -- System fields
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for coupons
CREATE INDEX "coupons_coupon_id_idx" ON "coupons"("coupon_id");
CREATE INDEX "coupons_match_id_idx" ON "coupons"("match_id");
CREATE INDEX "coupons_match_date_idx" ON "coupons"("match_date");
CREATE INDEX "coupons_created_at_idx" ON "coupons"("created_at" DESC);

// Script to recreate tables with correct column order
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

// Override DATABASE_URL with URL-encoded password
process.env.DATABASE_URL = 'postgresql://postgres:Iron4maiden124%21@localhost:1906/bet_assistant';

const prisma = new PrismaClient();

async function recreateTables() {
  try {
    console.log('Łączę z bazą danych...');

    console.log('Usuwam tabele...');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "coupons" CASCADE');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "bets" CASCADE');
    
    console.log('Tworzę tabelę bets z właściwą kolejnością kolumn...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "bets" (
        "id" SERIAL PRIMARY KEY,
        "home_team" VARCHAR(100) NOT NULL,
        "away_team" VARCHAR(100) NOT NULL,
        "bet_type" VARCHAR(50) NOT NULL,
        "bet_option" VARCHAR(50) NOT NULL,
        "szanse" VARCHAR(50),
        "odds" DECIMAL(6,2),
        "moc_bet" DECIMAL(8,2),
        "stat_5_h_overall" VARCHAR(50),
        "stat_5_a_overall" VARCHAR(50),
        "stat_5_h_ha" VARCHAR(50),
        "stat_5_a_ha" VARCHAR(50),
        "stat_10_h_overall" VARCHAR(50),
        "stat_10_a_overall" VARCHAR(50),
        "stat_10_h_ha" VARCHAR(50),
        "stat_10_a_ha" VARCHAR(50),
        "stat_15_h_overall" VARCHAR(50),
        "stat_15_a_overall" VARCHAR(50),
        "stat_15_h_ha" VARCHAR(50),
        "stat_15_a_ha" VARCHAR(50),
        "entered" VARCHAR(10),
        "result_home" INTEGER,
        "result_away" INTEGER,
        "standing_home" INTEGER,
        "standing_away" INTEGER,
        "comment" TEXT,
        "country" VARCHAR(100),
        "league" VARCHAR(150),
        "match_date" DATE,
        "superbet_link" VARCHAR(500),
        "match_id" INTEGER,
        "flashscore_link" VARCHAR(500),
        "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    
    console.log('Tworzę indeksy dla bets...');
    await prisma.$executeRawUnsafe('CREATE INDEX "bets_match_id_idx" ON "bets"("match_id")');
    await prisma.$executeRawUnsafe('CREATE INDEX "bets_match_date_idx" ON "bets"("match_date")');
    await prisma.$executeRawUnsafe('CREATE INDEX "bets_created_at_idx" ON "bets"("created_at" DESC)');
    
    console.log('Tworzę tabelę coupons z właściwą kolejnością kolumn...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "coupons" (
        "id" SERIAL PRIMARY KEY,
        "home_team" VARCHAR(100) NOT NULL,
        "away_team" VARCHAR(100) NOT NULL,
        "bet_type" VARCHAR(50) NOT NULL,
        "bet_option" VARCHAR(50) NOT NULL,
        "szanse" VARCHAR(50),
        "odds" DECIMAL(6,2),
        "moc_bet" DECIMAL(8,2),
        "stat_5_h_overall" VARCHAR(50),
        "stat_5_a_overall" VARCHAR(50),
        "stat_5_h_ha" VARCHAR(50),
        "stat_5_a_ha" VARCHAR(50),
        "stat_10_h_overall" VARCHAR(50),
        "stat_10_a_overall" VARCHAR(50),
        "stat_10_h_ha" VARCHAR(50),
        "stat_10_a_ha" VARCHAR(50),
        "stat_15_h_overall" VARCHAR(50),
        "stat_15_a_overall" VARCHAR(50),
        "stat_15_h_ha" VARCHAR(50),
        "stat_15_a_ha" VARCHAR(50),
        "entered" VARCHAR(10),
        "result_home" INTEGER,
        "result_away" INTEGER,
        "standing_home" INTEGER,
        "standing_away" INTEGER,
        "comment" TEXT,
        "country" VARCHAR(100),
        "league" VARCHAR(150),
        "match_date" DATE,
        "superbet_link" VARCHAR(500),
        "match_id" INTEGER,
        "coupon_id" VARCHAR(20),
        "flashscore_link" VARCHAR(500),
        "stake" DECIMAL(10,2),
        "potential_win" DECIMAL(10,2),
        "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    
    console.log('Tworzę indeksy dla coupons...');
    await prisma.$executeRawUnsafe('CREATE INDEX "coupons_coupon_id_idx" ON "coupons"("coupon_id")');
    await prisma.$executeRawUnsafe('CREATE INDEX "coupons_match_id_idx" ON "coupons"("match_id")');
    await prisma.$executeRawUnsafe('CREATE INDEX "coupons_match_date_idx" ON "coupons"("match_date")');
    await prisma.$executeRawUnsafe('CREATE INDEX "coupons_created_at_idx" ON "coupons"("created_at" DESC)');
    
    console.log('✅ Tabele zostały odtworzone z prawidłową kolejnością kolumn!');
    console.log('   - bets: A-AG (home_team → flashscore_link)');
    console.log('   - coupons: A-AI (home_team → potential_win)');
    
  } catch (error: any) {
    console.error('❌ Błąd:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

recreateTables();

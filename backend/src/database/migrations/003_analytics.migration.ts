/**
 * Database Migration: Analytics Tables
 * Creates tables for market analytics, salary benchmarks, trends, and insights
 */

export const AnalyticsMigration = {
  up: async (queryInterface: any, sequelize: any) => {
    const transaction = await sequelize.transaction();

    try {
      // ========================================================================
      // 1. MARKET ANALYTICS TABLE
      // ========================================================================
      await queryInterface.createTable(
        'market_analytics',
        {
          id: {
            type: sequelize.UUID,
            defaultValue: sequelize.UUIDV4,
            primaryKey: true,
          },
          period: {
            type: sequelize.STRING(100),
            allowNull: false,
          },
          total_jobs: {
            type: sequelize.INTEGER,
            defaultValue: 0,
          },
          total_applications: {
            type: sequelize.INTEGER,
            defaultValue: 0,
          },
          unique_skills: {
            type: sequelize.INTEGER,
            defaultValue: 0,
          },
          unique_locations: {
            type: sequelize.INTEGER,
            defaultValue: 0,
          },
          average_salary: {
            type: sequelize.DECIMAL(12, 2),
            defaultValue: 0,
          },
          median_salary: {
            type: sequelize.DECIMAL(12, 2),
            defaultValue: 0,
          },
          market_sentiment: {
            type: sequelize.ENUM('positive', 'neutral', 'negative'),
            defaultValue: 'neutral',
          },
          metadata: {
            type: sequelize.JSON,
            defaultValue: {},
          },
          created_at: {
            type: sequelize.DATE,
            defaultValue: sequelize.NOW,
          },
          updated_at: {
            type: sequelize.DATE,
            defaultValue: sequelize.NOW,
          },
        },
        { transaction },
      );

      // ========================================================================
      // 2. SALARY BENCHMARKS TABLE
      // ========================================================================
      await queryInterface.createTable(
        'salary_benchmarks',
        {
          id: {
            type: sequelize.UUID,
            defaultValue: sequelize.UUIDV4,
            primaryKey: true,
          },
          job_role: {
            type: sequelize.STRING(100),
            allowNull: false,
          },
          experience_level: {
            type: sequelize.ENUM('junior', 'mid', 'senior', 'lead'),
            allowNull: false,
          },
          location: {
            type: sequelize.STRING(100),
            allowNull: false,
          },
          min_salary: {
            type: sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          max_salary: {
            type: sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          median_salary: {
            type: sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          percentile_25: {
            type: sequelize.DECIMAL(12, 2),
          },
          percentile_75: {
            type: sequelize.DECIMAL(12, 2),
          },
          sample_size: {
            type: sequelize.INTEGER,
            defaultValue: 0,
          },
          currency: {
            type: sequelize.ENUM('USD', 'EUR', 'GBP', 'INR'),
            defaultValue: 'USD',
          },
          trend: {
            type: sequelize.ENUM('up', 'down', 'stable'),
            defaultValue: 'stable',
          },
          trend_percentage: {
            type: sequelize.DECIMAL(5, 2),
            defaultValue: 0,
          },
          created_at: {
            type: sequelize.DATE,
            defaultValue: sequelize.NOW,
          },
          updated_at: {
            type: sequelize.DATE,
            defaultValue: sequelize.NOW,
          },
        },
        { transaction },
      );

      // ========================================================================
      // 3. SKILL TRENDS TABLE
      // ========================================================================
      await queryInterface.createTable(
        'skill_trends',
        {
          id: {
            type: sequelize.UUID,
            defaultValue: sequelize.UUIDV4,
            primaryKey: true,
          },
          skill: {
            type: sequelize.STRING(100),
            allowNull: false,
          },
          timestamp: {
            type: sequelize.DATE,
            allowNull: false,
          },
          demand: {
            type: sequelize.INTEGER,
            allowNull: false,
          },
          month_over_month: {
            type: sequelize.DECIMAL(5, 2),
            defaultValue: 0,
          },
          year_over_year: {
            type: sequelize.DECIMAL(5, 2),
            defaultValue: 0,
          },
          job_postings: {
            type: sequelize.INTEGER,
            defaultValue: 0,
          },
          average_salary_impact: {
            type: sequelize.DECIMAL(10, 2),
            defaultValue: 0,
          },
          market_saturation: {
            type: sequelize.ENUM('low', 'medium', 'high'),
            defaultValue: 'medium',
          },
          created_at: {
            type: sequelize.DATE,
            defaultValue: sequelize.NOW,
          },
        },
        { transaction },
      );

      // ========================================================================
      // 4. HIRING TRENDS TABLE
      // ========================================================================
      await queryInterface.createTable(
        'hiring_trends',
        {
          id: {
            type: sequelize.UUID,
            defaultValue: sequelize.UUIDV4,
            primaryKey: true,
          },
          job_role: {
            type: sequelize.STRING(100),
            allowNull: false,
          },
          location: {
            type: sequelize.STRING(100),
            allowNull: false,
          },
          timestamp: {
            type: sequelize.DATE,
            allowNull: false,
          },
          hiring_volume: {
            type: sequelize.INTEGER,
            allowNull: false,
          },
          month_over_month: {
            type: sequelize.DECIMAL(5, 2),
            defaultValue: 0,
          },
          year_over_year: {
            type: sequelize.DECIMAL(5, 2),
            defaultValue: 0,
          },
          average_time_to_hire: {
            type: sequelize.INTEGER,
            defaultValue: 0,
          },
          acceptance_rate: {
            type: sequelize.DECIMAL(5, 2),
            defaultValue: 0,
          },
          created_at: {
            type: sequelize.DATE,
            defaultValue: sequelize.NOW,
          },
        },
        { transaction },
      );

      // ========================================================================
      // 5. MARKET INSIGHTS TABLE
      // ========================================================================
      await queryInterface.createTable(
        'market_insights',
        {
          id: {
            type: sequelize.UUID,
            defaultValue: sequelize.UUIDV4,
            primaryKey: true,
          },
          title: {
            type: sequelize.STRING(255),
            allowNull: false,
          },
          category: {
            type: sequelize.ENUM('skill', 'location', 'salary', 'hiring', 'trend'),
            allowNull: false,
          },
          description: {
            type: sequelize.TEXT,
          },
          relevance: {
            type: sequelize.INTEGER,
            defaultValue: 0,
          },
          timeframe: {
            type: sequelize.STRING(100),
          },
          actionable_items: {
            type: sequelize.JSON,
            defaultValue: [],
          },
          created_at: {
            type: sequelize.DATE,
            defaultValue: sequelize.NOW,
          },
          expires_at: {
            type: sequelize.DATE,
          },
        },
        { transaction },
      );

      // ========================================================================
      // 6. CREATE INDEXES
      // ========================================================================
      await queryInterface.addIndex('market_analytics', ['period'], { transaction });
      await queryInterface.addIndex('market_analytics', ['created_at'], { transaction });

      await queryInterface.addIndex('salary_benchmarks', ['job_role', 'experience_level', 'location'], {
        transaction,
      });
      await queryInterface.addIndex('salary_benchmarks', ['median_salary'], { transaction });
      await queryInterface.addIndex('salary_benchmarks', ['updated_at'], { transaction });

      await queryInterface.addIndex('skill_trends', ['skill', 'timestamp'], { transaction });
      await queryInterface.addIndex('skill_trends', ['demand'], { transaction });
      await queryInterface.addIndex('skill_trends', ['market_saturation'], { transaction });

      await queryInterface.addIndex('hiring_trends', ['job_role', 'location', 'timestamp'], {
        transaction,
      });
      await queryInterface.addIndex('hiring_trends', ['hiring_volume'], { transaction });

      await queryInterface.addIndex('market_insights', ['category'], { transaction });
      await queryInterface.addIndex('market_insights', ['relevance'], { transaction });
      await queryInterface.addIndex('market_insights', ['expires_at'], { transaction });

      await transaction.commit();
      console.log('Analytics tables created successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface: any) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('market_insights', { transaction });
      await queryInterface.dropTable('hiring_trends', { transaction });
      await queryInterface.dropTable('skill_trends', { transaction });
      await queryInterface.dropTable('salary_benchmarks', { transaction });
      await queryInterface.dropTable('market_analytics', { transaction });

      await transaction.commit();
      console.log('Analytics tables dropped successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

export default AnalyticsMigration;

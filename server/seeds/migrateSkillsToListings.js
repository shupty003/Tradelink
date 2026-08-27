/**
 * Copy legacy Skill documents into the current SkillListing collection.
 * Legacy documents are left untouched so this can be safely verified and rerun.
 */

'use strict';

require('../config/env');
const connectDB = require('../config/db');
const { Skill } = require('../models/Skill.model');
const SkillListing = require('../models/SkillListing.model');
const SkillCategory = require('../models/SkillCategory.model');
const valuationService = require('../services/valuation.service');

const CATEGORY_SLUGS = {
  Programming: 'programming',
  'Graphic Design': 'graphic-design',
  'UI/UX': 'ui-ux',
  'Video Editing': 'video-editing',
  Writing: 'writing',
  Tutoring: 'tutoring',
  Music: 'music',
  Photography: 'photography',
  Marketing: 'marketing',
  'Career Advice': 'career-advice',
  'Language Learning': 'language-learning',
  Other: 'other',
};

const migrate = async () => {
  await connectDB();
  const legacySkills = await Skill.find().lean();
  let migrated = 0;
  let skipped = 0;

  for (const skill of legacySkills) {
    const category = CATEGORY_SLUGS[skill.category];
    if (!category) {
      skipped += 1;
      continue;
    }

    const existing = await SkillListing.findOne({
      user: skill.owner,
      title: skill.title,
      description: skill.description,
      category,
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await SkillListing.create({
      user: skill.owner,
      title: skill.title,
      description: skill.description,
      category,
      customCategoryName: category === 'other' ? 'Other' : null,
      status: skill.status === 'active' && skill.isActive !== false ? 'active' : 'inactive',
    });

    if (category !== 'other' && skill.status === 'active' && skill.isActive !== false) {
      const categoryExists = await SkillCategory.exists({ slug: category });
      if (categoryExists) {
        await valuationService.updateSupply(category, 1);
      }
    }
    migrated += 1;
  }

  console.log(`Migrated ${migrated} legacy skills; skipped ${skipped}.`);
  await require('mongoose').connection.close();
};

migrate().catch(async error => {
  console.error(error.message);
  await require('mongoose').connection.close();
  process.exitCode = 1;
});
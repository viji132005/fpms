/**
 * Faculty Profile Completeness Score Calculator for MIT Mysore
 * Calculates dynamic profile completeness based on institutional standards.
 */

export interface FacultyProfileData {
  fullName?: string;
  designation?: string;
  qualification?: string;
  specialization?: string;
  phone?: string;
  bio?: string;
  profilePhotoUrl?: string;
  cvUrl?: string;
  activityCount?: number;
}

export interface CompletenessResult {
  score: number; // 0 to 100
  completedFields: string[];
  missingFields: string[];
}

export function calculateProfileCompleteness(
  profile: FacultyProfileData
): CompletenessResult {
  const criteria = [
    {
      name: 'Full Name',
      weight: 10,
      isComplete: !!profile.fullName && profile.fullName.trim().length > 2,
    },
    {
      name: 'Academic Designation',
      weight: 10,
      isComplete: !!profile.designation && profile.designation.trim().length > 0,
    },
    {
      name: 'Educational Qualifications',
      weight: 10,
      isComplete: !!profile.qualification && profile.qualification.trim().length > 0,
    },
    {
      name: 'Domain Specialization',
      weight: 15,
      isComplete:
        !!profile.specialization && profile.specialization.trim().length > 0,
    },
    {
      name: 'Contact Phone',
      weight: 10,
      isComplete: !!profile.phone && profile.phone.trim().length >= 10,
    },
    {
      name: 'Academic Biography',
      weight: 15,
      isComplete: !!profile.bio && profile.bio.trim().length >= 20,
    },
    {
      name: 'Profile Photograph',
      weight: 10,
      isComplete:
        !!profile.profilePhotoUrl && profile.profilePhotoUrl.trim().length > 0,
    },
    {
      name: 'Curriculum Vitae (CV/Resume)',
      weight: 10,
      isComplete: !!profile.cvUrl && profile.cvUrl.trim().length > 0,
    },
    {
      name: 'Academic Portfolio Activity',
      weight: 10,
      isComplete: (profile.activityCount ?? 0) > 0,
    },
  ];

  let score = 0;
  const completedFields: string[] = [];
  const missingFields: string[] = [];

  for (const item of criteria) {
    if (item.isComplete) {
      score += item.weight;
      completedFields.push(item.name);
    } else {
      missingFields.push(item.name);
    }
  }

  return {
    score,
    completedFields,
    missingFields,
  };
}

/**
 * Clinical Sample Test Cases for Rapid Evaluation and Demonstration
 * Maps real high-resolution biomedical image assets to clinical test scenarios.
 */

export interface SampleCase {
  id: string;
  title: string;
  description: string;
  expectedClass: 'normal' | 'anemia' | 'suboptimal_quality';
  imageUrl: string;
  groundTruthHb?: number;
  clinicalNotes: string;
  recommendedRoi?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Import asset URLs
import sampleNormalUrl from '../assets/images/sample_normal_eye_1791128079128.jpg';
import samplePaleUrl from '../assets/images/sample_pale_eye_1791128089878.jpg';
import sampleBlurUrl from '../assets/images/sample_blur_eye_1791128100339.jpg';
import heroOpticUrl from '../assets/images/hero_conjunctiva_optic_1791128067376.jpg';

export { sampleNormalUrl, samplePaleUrl, sampleBlurUrl, heroOpticUrl };

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'case_normal_01',
    title: 'Clinical Sample A — Normal Vascularization',
    description: 'Vibrant erythematous capillary plexus visible along palpebral fold. Well-lit clinical capture.',
    expectedClass: 'normal',
    imageUrl: sampleNormalUrl,
    groundTruthHb: 14.2,
    clinicalNotes: 'Demonstrates intact microvascular perfusion, prominent hemoglobin absorption in red channels.',
    recommendedRoi: {
      x: 180,
      y: 420,
      width: 480,
      height: 220,
    },
  },
  {
    id: 'case_pale_02',
    title: 'Clinical Sample B — Palpebral Pallor (Anemia Suspicion)',
    description: 'Blanched mucosal bed with marked reduction in vascular capillary density and erythema.',
    expectedClass: 'anemia',
    imageUrl: samplePaleUrl,
    groundTruthHb: 8.4,
    clinicalNotes: 'Characteristic clinical presentation of moderate-to-severe iron deficiency anemia pallor.',
    recommendedRoi: {
      x: 190,
      y: 410,
      width: 460,
      height: 210,
    },
  },
  {
    id: 'case_blur_03',
    title: 'Quality Stress Test — Optical Motion Blur & Glare',
    description: 'Suboptimal focus with slight motion artifact and reflection to test the automated IQA rejection filter.',
    expectedClass: 'suboptimal_quality',
    imageUrl: sampleBlurUrl,
    groundTruthHb: 12.1,
    clinicalNotes: 'Demonstrates the safety gatekeeper: IQA rejects low-quality images to prevent spurious AI predictions.',
    recommendedRoi: {
      x: 170,
      y: 400,
      width: 480,
      height: 230,
    },
  },
];

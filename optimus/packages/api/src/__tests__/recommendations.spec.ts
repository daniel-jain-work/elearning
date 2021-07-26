import { ClassModel, CourseModel } from 'cl-models';
import { getRecommendation } from '../lib/recommendations';
import sequelize from '../sequelize';

afterAll(() => sequelize.close());

describe('class recommendations', () => {
  let next: CourseModel;

  test('unknown age', async () => {
    next = await getRecommendation(0, []);
    expect(next.id).toBe('scratch_1');

    //recommend scratch level 3 since level 2 is taken
    next = await getRecommendation(
      0,
      ClassModel.bulkBuild([{ courseId: 'scratch_2' }])
    );
    expect(next.id).toBe('scratch_3');
    //recommend ai-explorers level 1 since you are done with scratch
    next = await getRecommendation(
      0,
      ClassModel.bulkBuild([{ courseId: 'scratch_4' }])
    );
    expect(next.id).toBe('ai-explorers_1');

    // you are all done
    next = await getRecommendation(
      0,
      ClassModel.bulkBuild([
        { courseId: 'scratch_3' },
        { courseId: 'ai-explorers_3' }
      ])
    );
    expect(next).toBeFalsy();
  });

  test('for 12 years old', async () => {
    //recommend ascratch level 1
    next = await getRecommendation(
      12,
      ClassModel.bulkBuild([{ courseId: 'ascratch_0' }])
    );
    expect(next.id).toBe('ascratch_1');

    //recommend data-science level 1, skip minecraft
    next = await getRecommendation(
      12,
      ClassModel.bulkBuild([
        { courseId: 'ascratch_3' },
        { courseId: 'ai-explorers_3' },
        { courseId: 'robots_3' }
      ])
    );
    expect(next.id).toBe('design_1');

    //recommend robots level 1, skip scratch
    next = await getRecommendation(
      12,
      ClassModel.bulkBuild([
        { courseId: 'ai-explorers_3' },
        { courseId: 'minecraft_3' }
      ])
    );

    //skip scratch after done accelerated scratch
    next = await getRecommendation(
      0,
      ClassModel.bulkBuild([
        { courseId: 'ai-explorers_0' },
        { courseId: 'scratch_0' },
        { courseId: 'data-science_0' },
        { courseId: 'ascratch_1' },
        { courseId: 'ascratch_2' },
        { courseId: 'ascratch_3' }
      ])
    );
    expect(next.id).toBe('ai-explorers_1');
  });
});

import { Notes } from './notesTable';
import { handler } from './readFunction';

const note = {
  pk: 'note',
  sk: new Date().toISOString(),
  date: new Date().toISOString(),
  note: `Don't forget things!`,
  subject: 'An Important Note',
  type: 'note',
};

describe('Read Function', () => {
  beforeAll(() => {
    jest.spyOn(Notes, 'find').mockReturnValue(Promise.resolve([note]));
  });
  test('Return a 200 response', async () => {
    const response = await handler();
    expect(response).toMatchObject({
      body: JSON.stringify([note]),
      statusCode: 200,
    });
  });
});

import { crashFrames, crashReport } from '../../src/core/crash';

const withStack = (stack: string) => Object.assign(new Error('x'), { stack });

describe('crash', () => {
  it('sums up a crash by the error kind and the first line of its message', () => {
    expect(crashReport(new TypeError('x is undefined\n    at render'), null).error).toBe('TypeError: x is undefined');
  });

  it('caps a crash summary at 100 characters', () => {
    expect(crashReport(new Error('y'.repeat(300)), null).error).toHaveLength(100);
  });

  it('sums up a thrown value that is not an error by its text', () => {
    expect(crashReport('plain failure', null).error).toBe('plain failure');
  });

  it('reports where a Chrome stack threw', () => {
    expect(crashReport(withStack('Error: x\n    at Xe (https://drumverter.com/assets/index-AbC1.js:1:2345)'), null).thrown).toBe('Xe@index-AbC1.js:1:2345');
  });

  it('reports where a Firefox or Safari stack threw', () => {
    expect(crashReport(withStack('Xe@https://drumverter.com/assets/index-AbC1.js:1:2345'), null).thrown).toBe('Xe@index-AbC1.js:1:2345');
  });

  it('reports no throw site for an error without a stack', () => {
    expect(crashReport('plain failure', null).thrown).toBe('');
  });

  it('names the components without host elements', () => {
    expect(crashReport(new Error('x'), '\n    at Xe (https://x/assets/a.js:1:2)\n    at div (<anonymous>)\n    at Qa (<anonymous>)').components).toBe('Xe@a.js:1:2 < Qa');
  });

  it('keeps a minified lowercase component that has a location', () => {
    expect(crashReport(new Error('x'), '\n    at un (https://x/assets/a.js:1:2)').components).toBe('un@a.js:1:2');
  });

  it('reports at most four component frames', () => {
    expect(crashReport(new Error('x'), '\n    at A (<anonymous>)'.repeat(6)).components).toBe('A < A < A < A');
  });

  it('names the components without host elements in a Firefox or Safari stack', () => {
    expect(crashReport(new Error('x'), '\nXe@https://x/assets/a.js:1:2\ndiv@unknown:0:0\nmain@unknown:0:0\nQa@https://x/assets/a.js:1:9').components).toBe('Xe@a.js:1:2 < Qa@a.js:1:9');
  });

  it('skips a Chrome message line that looks like a position', () => {
    expect(crashReport(Object.assign(new SyntaxError('Unexpected token at 1:5'), { stack: 'SyntaxError: Unexpected token at 1:5\n    at Xe (https://x/assets/a.js:1:2)' }), null).thrown).toBe('Xe@a.js:1:2');
  });

  it('sums up a thrown value that cannot become text', () => {
    expect(crashReport(Object.create(null), null).error).toBe('[object Object]');
  });

  it('reads back the frames it reports with a position', () => {
    expect(crashFrames('Xe@a.js:1:2 < Qa').map(({ methodName, file, lineNumber, column }) => [methodName, file, lineNumber, column]))
      .toEqual([['Xe', 'a.js', 1, 2]]);
  });

  it('keeps only whole component frames within 200 characters', () => {
    const name = 'A'.repeat(90);
    expect(crashReport(new Error('x'), `\n    at ${name} (<anonymous>)`.repeat(4)).components).toBe(`${name} < ${name}`);
  });

  it('reports no throw site rather than a cut one', () => {
    expect(crashReport(withStack(`Error: x\n    at ${'A'.repeat(300)} (https://x/assets/a.js:1:2)`), null).thrown).toBe('');
  });

  it('reports an error whose stack is not text', () => {
    expect(crashReport(Object.assign(new Error('x'), { stack: 42 }), null)).toEqual({ error: 'Error: x', thrown: '', components: '' });
  });

  it('reports an error whose fields throw when read', () => {
    const error = Object.defineProperty(new Error('x'), 'name', {
      get: () => {
        throw new Error('unreadable');
      },
    });
    expect(crashReport(error, '\n    at Xe (https://x/assets/a.js:1:2)')).toEqual({ error: '[object Error]', thrown: '', components: '' });
  });
});

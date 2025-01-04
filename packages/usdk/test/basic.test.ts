import { createRoot } from 'react-agents';

// A simple function to test
export const sum = (a: number, b: number): number => a + b;

// Unit test for the sum function
test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});

test('createRoot', () => {
  expect(createRoot).toBeDefined();
});
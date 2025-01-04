/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
//   testEnvironment: 'jest-environment-node',
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '**/test/?(*.)+(spec|test).[jt]s?(x)',
  ],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};
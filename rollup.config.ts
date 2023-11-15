import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import { typescriptPaths } from "rollup-plugin-typescript-paths";

const isProduction = process.env.NODE_ENV === "production";

const config = {
  input: "./src/index.ts",
  output: [
    {
      file: "build/index.js",
      format: "esm",
      sourcemap: !isProduction,
    },
  ],
  preserveSymlinks: true,
  external: {},
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    peerDepsExternal(),
    commonjs({
      include: /node_modules/,
    }),
    babel({
      exclude: /node_modules/,
      babelHelpers: "bundled",
      babelrc: true,
    }),
    nodeResolve(),
    typescriptPaths(),
  ],
};

export default config;

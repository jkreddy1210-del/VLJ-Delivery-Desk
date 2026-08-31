module.exports = {
  apps: [
    {
      name: "vlj-nitro",
      script: ".output/server/index.mjs",
      interpreter: "node",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: "5173",
      },
    },
  ],
};

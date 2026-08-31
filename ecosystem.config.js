module.exports = {
  apps: [
    {
      name: "vlj",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

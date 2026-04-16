const { createServer } = require("./app/server");
const { config } = require("./app/core/config");

const main = async () => {
  const app = await createServer();
  const port = config.PORT;
  await new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      resolve(server);
    });
    server.on("error", reject);
  });
};

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});

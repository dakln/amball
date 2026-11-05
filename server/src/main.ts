import { server } from '#config/app.config.ts';

const port = Number(process.env['PORT'] ?? 2567);

await server.listen(port);
console.log(`Amball: сервер слушает порт ${port}`);

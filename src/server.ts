import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";

export class Server {
    private httpServer: HTTPServer;
    private app: Application;
    private io: SocketIOServer;

    private readonly DEFAULT_PORT = 5000;

    private activeSockets: string[] = [];

    constructor() {
        this.initialize();

        this.handleRoutes();
        this.handleSocketConnection();
    }

    private initialize(): void {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = socketIO(this.httpServer);

        this.configureApp();
        this.handleSocketConnection();
    }

    private handleRoutes(): void {
        this.app.get("/", (req, res) => {
            res.send(`<h1>Hello World</h1>`);
        });
    }

    private handleSocketConnection(): void {
        this.io.on("connection", socket => {
            const existingSocket = this.activeSockets.find(
                existingSocket => existingSocket === socket.id
            );

            if (!existingSocket) {
                this.activeSockets.push(socket.id);

                socket.emit("update-user-list", {
                    users: this.activeSockets.filter(
                        existingSocket => existingSocket !== socket.id
                    )
                });

                socket.broadcast.emit("update-user-list", {
                    users: [socket.id]
                });

                socket.on("disconnect", () => {
                    this.activeSockets = this.activeSockets.filter(
                        existingSocket => existingSocket !== socket.id
                    );
                    socket.broadcast.emit("remove-user", {
                        socketId: socket.id
                    });
                });

                socket.on("call-user", data => {
                    socket.to(data.to).emit("call-made", {
                        offer: data.offer,
                        socket: socket.id
                    });
                });

                socket.on("make-answer", data => {
                    socket.to(data.to).emit("answer-made", {
                        socket: socket.id,
                        answer: data.answer
                    });
                });

                socket.on("reject-call", data => {
                    socket.to(data.from).emit("call-rejected", {
                        socket: socket.id
                    });
                });
            }
        })
    }

    public listen(callback: (port: number) => void): void {
        this.httpServer.listen(this.DEFAULT_PORT,"0.0.0.0", () =>
            callback(this.DEFAULT_PORT)
        );
    }

    private configureApp(): void {
        this.app.use(express.static(path.join(__dirname, "../public")));
    }
}
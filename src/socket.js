import { io } from 'socket.io-client';
import { API_URL } from './config';
export const connectSocket = (token) => io(API_URL, { auth: { token }, transports: ['websocket'], reconnection: true, reconnectionDelayMax: 5000 });

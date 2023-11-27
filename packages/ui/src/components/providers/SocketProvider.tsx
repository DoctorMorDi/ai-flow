import React, { createContext, useState, ReactNode, useEffect, useContext } from 'react';
import { io, Socket } from "socket.io-client";
import { UserContext } from './UserProvider';
import { APIKeys } from '../popups/configPopup/ApiKeys';

export type WSConfiguration = {
    apiKeys?: APIKeys;
}

interface ISocketContext {
    socket: Socket | null;
    config: WSConfiguration | null;
    verifyConfiguration: (() => boolean);
    connectSocket: ((configuration: WSConfiguration) => void) | null;
}

interface SocketProviderProps {
    children: ReactNode;
}

const WS_HOST = process.env.REACT_APP_WS_HOST || 'localhost';
const WS_PORT = process.env.REACT_APP_WS_PORT || 5000;
const USE_HTTPS = process.env.REACT_APP_USE_HTTPS || 'false';

const protocol = USE_HTTPS.toLowerCase() === 'true' ? 'https' : 'http';

export const SocketContext = createContext<ISocketContext>({
    socket: null,
    config: null,
    verifyConfiguration: () => { return false },
    connectSocket: null
});

export const SocketProvider = ({ children }: SocketProviderProps) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [config, setConfig] = useState<WSConfiguration | null>(null);

    const { user, getUserIDToken, getUserAccessToken } = useContext(UserContext);

    useEffect(() => {
        if (socket) {
            socket.disconnect();
        }

        const storedApiKeys = window.localStorage.getItem('apiKeys');

        const config = {
            apiKeys: !!storedApiKeys ? JSON.parse(storedApiKeys) : undefined,
        }

        // Connect by default only if user got api keys
        if (!!storedApiKeys || !!user) {
            const newSocket = connectSocket(config);

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        }

    }, [user]);

    function connectSocket(configuration: WSConfiguration): Socket {
        setConfig(configuration);

        const newSocket = io(`${protocol}://${WS_HOST}:${WS_PORT}`);

        if (!!user) {
            const idToken = getUserIDToken();
            const accessToken = getUserAccessToken()
            newSocket.emit('auth', { idToken, accessToken });
        }

        setSocket(newSocket);

        return newSocket;
    }

    function verifyConfiguration(): boolean {
        if (!config) {
            return false;
        }

        if (config.apiKeys?.openai_api_key) {
            return true;
        }

        return false;
    }

    return (
        <SocketContext.Provider value={{ socket, config, verifyConfiguration, connectSocket }}>
            {children}
        </SocketContext.Provider>
    );
};
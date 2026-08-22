export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface Device {
    id: string;
    uuid: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    _count: {
        logs: number;
    };
}

export interface Log {
    id: string;
    uuidCloud: string;
    localId: number;
    idUserLocal: number;
    tipo: string;
    descripcion: string;
    ingreso: number;
    cambio: number;
    total: number;
    estatus: string;
    fecha: string;
    deviceId: string;
    device?: {
        name: string;
        uuid: string;
    };
}

export interface LoginResponse {
    message: string;
    token: string;
    user: User;
}

export interface LogsResponse {
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    logs: Log[];
}
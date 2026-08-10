import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const app = express();

const allowedOrigins = [
  'http://localhost:5173', // Puerto común para Vite / React
  'http://localhost:3000', // Puerto común para Next.js
  'http://localhost:8080', // Puerto común para Vue
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como cURL, Postman o programas locales en C++)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Bloqueado por CORS: El origen ${origin} no está autorizado.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key',
    'x-master-key'
  ],
  credentials: true
}));

app.use(express.json());

// ==========================================
// RUTAS DE LA API
// ==========================================

// Ruta base
app.get('/', (req, res) => {
  res.send('API de Maxi-Cloud funcionando correctamente 🚀');
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Extension de tipo para Typescript (para adjuntar el usuario decodificado a Request)
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validaciones básicas de entrada
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Todos los campos (name, email, password) son obligatorios' });
      return;
    }

    // 2. Verificar si el correo ya está registrado
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(409).json({ error: 'El correo electrónico ya está registrado' });
      return;
    }

    // 3. Encriptar la contraseña (salting)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Crear el usuario en PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'ADMIN'
      }
    });

    // 5. Devolver respuesta omitiendo la contraseña
    res.status(201).json({
      message: 'Usuario web registrado con éxito',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor al registrar el usuario',
      details: error?.message || error
    });
  }
});


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body; // El frontend te envía el token obtenido de Google

    // 1. Verificar el token con Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ error: 'Token de Google inválido' });
      return;
    }

    const { sub: googleId, email, name } = payload;

    if (!email) {
      res.status(400).json({ error: 'No se pudo obtener el correo de Google' });
      return;
    }

    // 2. Buscar si el usuario ya existe en PostgreSQL o crearlo
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Si no existe, lo creamos automáticamente sin contraseña
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'Usuario de Google',
          googleId,
          password: null
        }
      });
    } else if (!user.googleId) {
      // Si ya existía por correo/contraseña, le enlazamos su googleId
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId }
      });
    }

    // 3. Responder con los datos del usuario (o tu propio JWT)
    res.status(200).json({
      message: 'Autenticación con Google exitosa',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error en autenticación Google:', error);
    res.status(500).json({ error: 'Fallo al autenticar con Google' });
  }
});

const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso denegado: Token no proporcionado o formato inválido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    req.user = decoded; // Guardamos los datos del usuario en la petición
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido o expirado' });
    return;
  }
};

// ==========================================
// RUTAS DE AUTENTICACIÓN WEB
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
      return;
    }

    // Buscar usuario en PostgreSQL
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Verificar contraseña con bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Generar JWT (Válido por 8 horas)
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('Error en el login:', error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
});

// 2. Ruta Protegida de Ejemplo: Obtener perfil del usuario actual
app.get('/api/auth/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar perfil' });
  }
});

// ==========================================
// REGISTRO DE DISPOSITIVOS (CLOUD)
// ==========================================
app.post('/api/devices/register', async (req, res) => {
  try {
    const masterKey = req.headers['x-master-key'];
    const expectedMasterKey = process.env.MASTER_REGISTRATION_KEY;

    if (!masterKey || masterKey !== expectedMasterKey) {
      res.status(401).json({ error: 'Acceso denegado: Clave Maestra de registro inválida' });
      return;
    }

    const { uuid, name } = req.body;

    if (!uuid || !name) {
      res.status(400).json({ error: 'Faltan campos obligatorios: "uuid" y "name"' });
      return;
    }

    const existingDevice = await prisma.device.findUnique({
      where: { uuid }
    });

    if (existingDevice) {
      res.status(409).json({
        error: 'El dispositivo con este UUID ya está registrado',
        deviceId: existingDevice.id
      });
      return;
    }

    const generatedApiKey = `mc_live_${crypto.randomBytes(24).toString('hex')}`;

    const newDevice = await prisma.device.create({
      data: {
        uuid,
        name,
        apiKey: generatedApiKey,
        active: true
      }
    });

    res.status(201).json({
      message: 'Cajero registrado e inicializado con éxito',
      device: {
        id: newDevice.id,
        uuid: newDevice.uuid,
        name: newDevice.name,
        apiKey: newDevice.apiKey
      }
    });

  } catch (error: any) {
    console.error('Error al registrar dispositivo:', error);
    // 2. Muestra el mensaje de error real si ocurre un fallo
    res.status(500).json({
      error: 'Error interno del servidor al procesar el registro',
      details: error?.message || error
    });
  }
});

// ==========================================
// RUTAS PROTEGIDAS PARA DASHBOARD WEB (JWT)
// ==========================================

// 1. Obtener la lista de todos los cajeros con su total de logs registrados
app.get('/api/devices', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { logs: true } // Cuenta cuántos registros ha enviado este cajero
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ devices });
  } catch (error) {
    console.error('Error al obtener cajeros:', error);
    res.status(500).json({ error: 'Error al consultar la lista de dispositivos' });
  }
});

// 2. Obtener el historial de Logs con filtros y paginación
app.get('/api/logs', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceId, tipo, estatus, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    // Filtros dinámicos opcionales
    const where: any = {};
    if (deviceId) where.deviceId = String(deviceId);
    if (tipo) where.tipo = String(tipo);
    if (estatus) where.estatus = String(estatus);

    // Consulta paralela: datos + conteo total para paginación
    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        include: {
          device: {
            select: { name: true, uuid: true } // Incluye datos del cajero que generó el log
          }
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.log.count({ where })
    ]);

    res.status(200).json({
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      },
      logs
    });
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ error: 'Error al consultar el historial de transacciones' });
  }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});
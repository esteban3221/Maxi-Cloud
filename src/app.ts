import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const app = express();
app.use(express.json());

const allowedOrigins = [
  'https://www.maxi-cajero.com:5173', // Puerto común para Vite / React
  'https://www.maxi-cajero.com:3000', // Puerto común para Next.js
  'https://www.maxi-cajero.com:8080', // Puerto común para Vue
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

export const googleLogin = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Token de Google inválido' });
    }

    const { email, name } = payload;

    // Buscar o crear usuario en Prisma
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'Usuario Google',
          password: '', // Sin contraseña física
          role: 'ADMIN',
        },
      });
    }

    // Generar JWT del sistema
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Autenticación con Google exitosa',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(401).json({ error: 'Error al verificar token con Google' });
  }
};


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

    // 3. Generar tu propio Token JWT (asegúrate de usar la misma llave secreta que en tu login normal)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'tu_secreto_jwt', // Usa tu variable de entorno
      { expiresIn: '7d' } // El tiempo que consideres prudente
    );

    // 4. Responder con el token y los datos del usuario
    res.status(200).json({
      message: 'Autenticación con Google exitosa',
      token, // <-- ¡Esto era lo que faltaba enviar!
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

// Almacén temporal en memoria para los códigos de vinculación activos
interface PairingSession {
  uuid: string;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED';
  apiKey?: string;
  expiresAt: number;
}

const pairingSessions = new Map<string, PairingSession>();

// 1. POS solicita iniciar vinculación (Genera pairingCode de 6 caracteres)
app.post('/api/devices/init-pair', (req, res) => {
  const { uuid } = req.body;
  if (!uuid) {
    res.status(400).json({ error: 'El campo "uuid" es requerido' });
    return;
  }

  // Generar código único de 6 caracteres (Ej: A3F89C)
  const pairingCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos de vigencia

  pairingSessions.set(pairingCode, {
    uuid,
    status: 'PENDING',
    expiresAt,
  });

  const frontendUrl = `https://www.maxi-cajero.com:5173`;

  res.json({
    pairingCode,
    qrUrl: `${frontendUrl}/pair?code=${pairingCode}`,
    expiresInSeconds: 600
  });
});

// 2. POS hace Polling para verificar si el Dashboard ya aceptó
app.get('/api/devices/pair-status/:code', (req, res) => {
  const { code } = req.params;
  const session = pairingSessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Código de vinculación no encontrado' });
    return;
  }

  if (Date.now() > session.expiresAt) {
    session.status = 'EXPIRED';
    res.json({ status: 'EXPIRED' });
    return;
  }

  if (session.status === 'CLAIMED') {
    res.json({
      status: 'CLAIMED',
      apiKey: session.apiKey,
    });
    // Limpiar sesión usada
    pairingSessions.delete(code);
    return;
  }

  res.json({ status: 'PENDING' });
});

app.post('/api/devices/claim', async (req, res) => {
  try {
    console.log('--- INTENTO DE VINCULACIÓN RECIBIDO ---');
    console.log('Body completo:', req.body);
    console.log('Códigos activos actualmente en memoria:', Array.from(pairingSessions.keys()));

    const { pairingCode, name } = req.body;

    if (!pairingCode || !name) {
      res.status(400).json({ error: 'Se requieren "pairingCode" y "name"' });
      return;
    }

    // Asegurar limpieza de espacios y mayúsculas
    const cleanCode = pairingCode.trim().toUpperCase();
    const session = pairingSessions.get(cleanCode);

    if (!session) {
      console.log(`[Error] El código "${cleanCode}" NO existe en el mapa de sesiones.`);
      res.status(400).json({ error: 'Código de vinculación inválido o no encontrado.' });
      return;
    }

    if (Date.now() > session.expiresAt) {
      console.log(`[Error] El código "${cleanCode}" ya expiró.`);
      pairingSessions.delete(cleanCode);
      res.status(400).json({ error: 'El código de vinculación ha expirado.' });
      return;
    }

    // Generar API Key única para el cajero
    const generatedApiKey = `mc_live_${crypto.randomBytes(24).toString('hex')}`;

    // Crear o actualizar en Prisma
    const device = await prisma.device.upsert({
      where: { uuid: session.uuid },
      update: {
        name,
        apiKey: generatedApiKey,
        active: true
      },
      create: {
        uuid: session.uuid,
        name,
        apiKey: generatedApiKey,
        active: true
      }
    });

    // Marcar la sesión como reclamada para que el POS se entere en su siguiente polling
    session.status = 'CLAIMED';
    session.apiKey = generatedApiKey;

    console.log(`¡Dispositivo "${name}" vinculado exitosamente con UUID: ${session.uuid}!`);

    res.json({
      message: 'Dispositivo vinculado exitosamente',
      device: { id: device.id, name: device.name, uuid: device.uuid }
    });

  } catch (error: any) {
    console.error('Error interno en /api/devices/claim:', error);
    res.status(500).json({ error: 'Error interno al vincular dispositivo', details: error?.message });
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



// ==========================================
// RUTA PARA RECEPCIÓN DE LOGS DESDE EL POS (C++)
// ==========================================
app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    // 1. Extraer parámetros de paginación de la URL (por defecto página 1, 10 items)
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // 2. Extraer parámetros de los filtros (Cajero, Tipo, Estatus)
    const { deviceId, tipo, estatus } = req.query;

    // 3. Construir el objeto de búsqueda (WHERE) de Prisma dinámicamente
    const where: any = {};
    if (deviceId) where.deviceId = String(deviceId);
    if (tipo) where.tipo = String(tipo);
    if (estatus) where.estatus = String(estatus);

    // 4. Contar el total de registros para que funcione la paginación en React
    const total = await prisma.log.count({ where });

    // 5. Consultar los logs en la base de datos
    const logs = await prisma.log.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fecha: 'desc' }, // Los más recientes primero
      include: {
        device: {
          select: { name: true, uuid: true } // Traemos el nombre del cajero para la UI
        }
      }
    });

    // 6. Responder exactamente con la estructura que tu Frontend (LogsResponse) espera
    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });

  } catch (error) {
    console.error('Error al consultar los logs:', error);
    res.status(500).json({ error: 'Error interno al obtener el historial de logs' });
  }
});

app.post('/api/logs', async (req: Request, res: Response) => {
  try {

    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'Acceso denegado: API Key faltante' });
    }

    const device = await prisma.device.findUnique({
      where: { apiKey }
    });

    if (!device) {
      return res.status(403).json({ error: 'Cajero no autorizado o API Key inválida' });
    }

    const { logData } = req.body;

    if (!logData) {
      return res.status(400).json({ error: 'Estructura JSON inválida. Falta logData.' });
    }

    console.log("=== DATOS RECIBIDOS DESDE C++ ===");
    console.log(logData);
    console.log("Tipo de dato de la fecha:", typeof logData.fecha, "- Valor:", logData.fecha);

    let fechaString = String(logData.fecha);

    fechaString = fechaString.replace(/\.(\d{3})\d+/, '.$1');
    fechaString = fechaString.replace(/([+-]\d{2})$/, '$1:00');

    let fechaLog = new Date(fechaString);

    if (isNaN(fechaLog.getTime())) {
      console.warn('⚠️ Formato de fecha irreconocible, usando fecha actual:', logData.fecha);
      fechaLog = new Date();
    }

    try {
      const logGuardado = await prisma.log.upsert({
        where: {
          uuidCloud: String(logData.uuidCloud)
        },
        update: {
          tipo: String(logData.tipo),
          descripcion: String(logData.descripcion),
          ingreso: Number(logData.ingreso),
          cambio: Number(logData.cambio),
          total: Number(logData.total),
          estatus: String(logData.estatus),
          fecha: fechaLog,
          idUserLocal: Number(logData.idUserLocal)
        },
        create: {
          deviceId: device.id,
          uuidCloud: String(logData.uuidCloud),
          localId: Number(logData.localId),
          idUserLocal: Number(logData.idUserLocal),
          tipo: String(logData.tipo),
          descripcion: String(logData.descripcion),
          ingreso: Number(logData.ingreso),
          cambio: Number(logData.cambio),
          total: Number(logData.total),
          estatus: String(logData.estatus),
          fecha: fechaLog,
        }
      });

      // Respondemos 200 OK
      res.status(200).json({ success: true, logId: logGuardado.id });

    } catch (dbError: any) {
      throw dbError; // Si hay error, lo manda al catch principal
    }

  } catch (error) {
    console.error('Error al recibir log del POS:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar el log' });
  }
});

// ==========================================
// RUTAS DE ACTUALIZACIÓN (OTA PARA C++)
// ==========================================

app.get('/updates/:channel/:platform/latest.json', async (req: Request, res: Response) => {
  try {
    const { channel: rawChannel, platform: rawPlatform } = req.params;
    if (typeof rawChannel !== 'string' || typeof rawPlatform !== 'string') {
      res.status(400).json({ error: 'Parámetros de canal y plataforma inválidos' });
      return;
    }
    const channel = rawChannel;
    const platform = rawPlatform;

    const latestRelease = await prisma.updateRelease.findFirst({
      where: { channel, platform },
      orderBy: [{ major: 'desc' }, { minor: 'desc' }, { patch: 'desc' }, { build: 'desc' }]
    });

    if (!latestRelease) {
      res.status(404).json({ error: 'No hay versiones disponibles para este canal' });
      return;
    }

    // Responder exactamente con la estructura que tu código en C++ espera
    res.json({
      major: latestRelease.major,
      minor: latestRelease.minor,
      patch: latestRelease.patch,
      build: latestRelease.build,
      url: latestRelease.url
    });

  } catch (error) {
    console.error('Error al obtener la última versión:', error);
    res.status(500).json({ error: 'Error interno del servidor al verificar actualizaciones' });
  }
});

// 2. Ruta protegida para que el Administrador (desde el Dashboard Web) suba o registre una nueva versión
app.post('/api/updates/publish', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { channel, platform, major, minor, patch, build, url, changelog } = req.body;

    if (!channel || !platform || major === undefined || minor === undefined || patch === undefined || build === undefined || !url) {
      res.status(400).json({ error: 'Faltan campos obligatorios para publicar la actualización' });
      return;
    }

    const newRelease = await prisma.updateRelease.create({
      data: {
        channel,
        platform,
        major: Number(major),
        minor: Number(minor),
        patch: Number(patch),
        build: Number(build),
        url
      }
    });

    res.status(201).json({
      message: `Nueva versión para el canal [${channel}] publicada con éxito`,
      release: newRelease
    });

  } catch (error) {
    console.error('Error al publicar actualización:', error);
    res.status(500).json({ error: 'Error al registrar la nueva versión' });
  }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en https://www.maxi-cajero.com:${PORT}`);
});
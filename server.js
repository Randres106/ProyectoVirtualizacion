const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.DB_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

app.use(bodyParser.json());
app.use(morgan('combined')); 

const logDirectory = '/logs';
const logFilePath = path.join(logDirectory, 'log.txt');

if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
    console.log(`Directorio ${logDirectory} creado.`);
} else {
    console.log(`Directorio ${logDirectory} ya existe.`);
}

function writeLog(message) {
    const logMessage = `${new Date().toISOString()} - ${message}\n`;
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error al escribir en el log:', err);
        }
    });
}

writeLog('Servidor iniciado');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/data', async (req, res) => {
    const { name, email } = req.body;
    try {
        const result = await pool.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *', [name, email]);
        res.status(201).json({ message: 'Datos recibidos', data: result.rows[0] });
        writeLog(`Usuario agregado: ID ${result.rows[0].id}, Nombre ${name}, Email ${email}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al insertar datos en la base de datos' });
    }
});

app.get('/data', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).json({ message: 'Error al obtener datos' });
    }
});

app.delete('/data/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Registro eliminado correctamente' });
        writeLog(`Usuario eliminado: ID ${id}`);
    } catch (error) {
        console.error('Error al eliminar datos:', error);
        res.status(500).json({ message: 'Error al eliminar datos' });
    }
});

app.get('/logs', (req, res) => {
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer el log:', err);
            res.status(500).json({ message: 'Error al leer el log' });
            return;
        }
        const logs = data.trim().split('\n').map(line => {
            const [timestamp, message] = line.split(' - ');
            return { timestamp, message };
        });
        res.json(logs);
    });
});

process.on('SIGTERM', () => {
    writeLog('Servidor finalizado');
    process.exit();
});

process.on('SIGINT', () => {
    writeLog('Servidor finalizado');
    process.exit();
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

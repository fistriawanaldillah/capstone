const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');  
const admin = require('firebase-admin');

// Inisialisasi Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

const SECRET_KEY = 'secret123';

const UsersController = {

    // Register pengguna baru
    async register(request, h) {
        const { username, email, password } = request.payload;

        // Cek apakah email sudah terdaftar
        const userRef = db.collection('users').where('email', '==', email);
        const snapshot = await userRef.get();
        if (!snapshot.empty) {
            return h.response({ error: 'User already exists' }).code(400);
        }

        if (password.length < 8) {
            return h.response({ error: true, message: 'Password must be at least 8 characters' }).code(400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate user ID acak
        const userId = `user-${crypto.randomBytes(6).toString('base64url')}`;

        // Simpan pengguna baru ke Firestore
        const newUser = {
            id: userId,
            username,
            email,
            password: hashedPassword
        };

        await db.collection('users').doc(userId).set(newUser);

        return h.response({ message: 'User registered successfully!' }).code(201);
    },

    // Login pengguna
    async login(request, h) {
        const { email, password } = request.payload;

        const userRef = db.collection('users').where('email', '==', email);
        const snapshot = await userRef.get();
        if (snapshot.empty) {
            return h.response({ error: true, message: 'User not found' }).code(404);
        }

        const user = snapshot.docs[0].data();
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return h.response({ error: true, message: 'Invalid credentials' }).code(401);
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

        const response = {
            error: false,
            message: 'success',
            loginResult: {
                userId: user.id,  
                name: user.username,  
                token: token  
            }
        };

        return h.response(response).code(200);
    },

    // Mendapatkan semua pengguna
    async getAllUsers(request, h) {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => doc.data());

        return h.response(users).code(200);
    },

    // Mendapatkan pengguna berdasarkan ID
    async getUserById(request, h) {
        const { userId } = request.params;
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return h.response({ error: 'User not found' }).code(404);
        }

        return h.response(userDoc.data()).code(200);
    },

    // Update pengguna
    async updateUser(request, h) {
        const { userId } = request.params;
        const { username, email, password } = request.payload;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return h.response({ error: 'User not found' }).code(404);
        }

        const updatedData = {};
        if (username) updatedData.username = username;
        if (email) updatedData.email = email;
        if (password) updatedData.password = await bcrypt.hash(password, 10);

        await db.collection('users').doc(userId).update(updatedData);

        return h.response({ message: 'User updated successfully!' }).code(200);
    },

    // Hapus pengguna
    async deleteUser(request, h) {
        const { userId } = request.params;
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return h.response({ error: 'User not found' }).code(404);
        }

        await db.collection('users').doc(userId).delete();

        return h.response({ message: 'User deleted successfully!' }).code(200);
    },

    // Dapatkan profil pengguna
    async getProfile(request, h) {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return h.response({ error: true, message: 'Authorization token missing' }).code(401);
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, SECRET_KEY);

            const userDoc = await db.collection('users').doc(decoded.userId).get();

            if (!userDoc.exists) {
                return h.response({ error: true, message: 'User not found' }).code(404);
            }

            const user = userDoc.data();

            // Mengembalikan profil pengguna
            return h.response({
                error: false,
                message: 'success',
                profile: {
                    userId: user.id,
                    name: user.username,
                    email: user.email
                }
            }).code(200);
        } catch (err) {
            return h.response({ error: true, message: 'Invalid token' }).code(401);
        }
    }
};


module.exports = UsersController;

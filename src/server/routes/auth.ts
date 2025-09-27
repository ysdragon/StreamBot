import { Router } from 'express';
import bcrypt from 'bcrypt';
import config from '../../config.js';
import logger from '../../utils/logger.js';

const router = Router();

// Login route - GET
router.get("/login", (req, res) => {
	res.render('pages/login', {
		error: req.query.error === '1',
		showLogout: false
	});
});

// Login route - POST
router.post("/login", (req, res) => {
	const { username, password } = req.body;
	if (username === config.server_username && bcrypt.compareSync(password, config.server_password)) {
		(req.session as { user?: unknown }).user = username;
		res.redirect("/");
	} else {
		res.redirect("/login?error=1");
	}
});

// Logout route
router.get("/logout", (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			logger.error("Error destroying session:", err);
		}
		res.redirect("/login");
	});
});

export default router;
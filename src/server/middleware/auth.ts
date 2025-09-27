import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
	if ((req.session as { user?: unknown }).user) {
		next();
	} else {
		res.redirect("/login");
	}
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
	if (req.path === "/login") {
		next();
	} else {
		authMiddleware(req, res, next);
	}
};
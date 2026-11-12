import { All, Body, Controller, Get, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import path from 'node:path';

interface AuthUser {
  username: string;
  role: string;
}

declare module 'express-session' {
  interface SessionData {
    user?: AuthUser;
  }
}

const accounts: Record<string, { password: string }> = {
  writer: { password: 'writer1234!' },
  reviewer: { password: 'reviewer1234!' },
  'factory-user': { password: 'factory1234!' },
};

@Controller()
export class AppController {
  @Get('api/session')
  getSession(@Req() request: Request): { user: AuthUser | null } {
    return { user: request.session.user ?? null };
  }

  @Post('api/login')
  login(
    @Body() credentials: { username?: unknown; password?: unknown },
    @Req() request: Request,
  ): Promise<{ user: AuthUser } | { error: string }> | { error: string } {
    const username = credentials?.username;
    const password = credentials?.password;
    const account = typeof username === 'string' ? accounts[username] : undefined;

    if (!account || account.password !== password) {
      return { error: '로그인 정보를 확인하세요.' };
    }

    if (typeof username !== 'string') {
      return { error: '로그인 정보를 확인하세요.' };
    }

    const user: AuthUser = { username, role: username };
    request.session.user = user;
    return new Promise((resolve, reject) => {
      request.session.save((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ user });
      });
    });
  }

  @Post('api/logout')
  async logout(@Req() request: Request): Promise<{ user: null }> {
    await new Promise<void>((resolve, reject) => {
      request.session.destroy((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    return { user: null };
  }

  @Get(['/', '*path'])
  showPage(@Req() request: Request, @Res() response: Response): void {
    if (request.path === '/api' || request.path.startsWith('/api/')) {
      response.status(404).end();
      return;
    }

    response.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  }

  @All('api/{*path}')
  unknownApi(@Res() response: Response): void {
    response
      .status(HttpStatus.NOT_FOUND)
      .json({ error: '요청한 주소를 찾을 수 없습니다.' });
  }
}
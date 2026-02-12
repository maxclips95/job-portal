declare module 'pg';
declare module 'uuid';
declare module 'morgan';
declare module 'nodemailer';
declare module 'cors';
declare module 'multer';

declare namespace Express {
  interface Request {
    file?: any;
    files?: any;
  }
}

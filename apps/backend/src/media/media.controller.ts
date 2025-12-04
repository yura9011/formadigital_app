import { Controller, Post, UseInterceptors, UploadedFile, Get, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('media')
export class MediaController {
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        return {
            url: `http://localhost:3000/uploads/${file.filename}`,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size
        };
    }

    @Get()
    findAll() {
        // TODO: Implement listing of media if needed
        return [];
    }
}

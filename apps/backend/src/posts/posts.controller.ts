import { Body, Controller, Get, Post } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) { }

    @Post()
    create(@Body() body: { content: string; publishDate: string; integrationIds: string[]; media?: { path: string }[] }) {
        return this.postsService.createPost(body);
    }

    @Get()
    findAll() {
        return this.postsService.findAll();
    }
}

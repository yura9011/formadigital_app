
import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateProjectDto, UpdateProjectDto, CreatePhaseDto, UpdatePhaseDto, CreateTemplateDto, ReorderPhaseDto } from './dtos';
import { GmbService } from './gmb.service';
import type { SearchParams, Business } from './types';
import { ProjectStatus, PhaseStatus } from '@prisma/client';

@Controller('gmb')
export class GmbController {
    constructor(private readonly gmbService: GmbService) { }

    @Post('search')
    async search(@Body() params: any) {
        return this.gmbService.searchCompetitors(params);
    }

    @Post('audit')
    async audit(@Body() body: {
        clientData: Business | undefined,
        competitors: Business[],
        language: 'en' | 'es',
        userSearchAddress: string,
        productsList: string,
        zoneContext: string
    }) {
        return this.gmbService.performAudit(
            body.clientData,
            body.competitors,
            body.language,
            body.userSearchAddress,
            body.productsList,
            body.zoneContext
        );
    }

    @Get('leads')
    async getLeads() {
        return this.gmbService.getAllLeads();
    }

    @Get('client/:id')
    async getClient(@Param('id') id: string) {
        return this.gmbService.getClient(id);
    }

    @Patch('client/:id')
    async updateClient(@Param('id') id: string, @Body() data: any) {
        return this.gmbService.updateClient(id, data);
    }

    @Post('client/:id/notes')
    async addNote(@Param('id') id: string, @Body() body: { content: string }) {
        return this.gmbService.addNote(id, body.content);
    }

    @Delete('client/note/:id')
    async deleteNote(@Param('id') id: string) {
        return this.gmbService.deleteNote(id);
    }

    // --- Projects ---

    @Post('clients/:id/projects')
    async createProject(@Param('id') clientId: string, @Body() data: CreateProjectDto) {
        return this.gmbService.createProject(clientId, data);
    }

    @Get('clients/:id/projects')
    async getClientProjects(@Param('id') clientId: string) {
        return this.gmbService.getClientProjects(clientId);
    }

    @Get('projects')
    async getAllProjects() {
        return this.gmbService.getAllProjects();
    }

    @Patch('projects/:id')
    async updateProject(@Param('id') id: string, @Body() data: UpdateProjectDto) {
        return this.gmbService.updateProject(id, data);
    }

    @Delete('projects/:id')
    async deleteProject(@Param('id') id: string) {
        return this.gmbService.deleteProject(id);
    }

    // --- Phases ---

    @Post('projects/:id/phases')
    async addPhase(@Param('id') projectId: string, @Body() data: CreatePhaseDto) {
        return this.gmbService.addPhase(projectId, data);
    }

    @Patch('phases/:id')
    async updatePhase(@Param('id') id: string, @Body() data: UpdatePhaseDto) {
        return this.gmbService.updatePhase(id, data);
    }

    @Delete('phases/:id')
    async deletePhase(@Param('id') id: string) {
        return this.gmbService.deletePhase(id);
    }

    @Patch('phases/:id/reorder')
    async reorderPhase(@Param('id') id: string, @Body() data: ReorderPhaseDto) {
        return this.gmbService.reorderPhase(id, data.direction);
    }

    @Post('phases/:id/attachments')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array.from(Array(32)).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)} `);
            },
        }),
    }))
    async uploadAttachment(@Param('id') phaseId: string, @UploadedFile() file: Express.Multer.File) {
        return this.gmbService.addAttachment(phaseId, file);
    }

    // --- Templates ---

    @Post('templates')
    async createTemplate(@Body() data: CreateTemplateDto) {
        return this.gmbService.createTemplate(data);
    }

    @Get('templates')
    async getTemplates() {
        return this.gmbService.getTemplates();
    }

    @Delete('templates/:id')
    async deleteTemplate(@Param('id') id: string) {
        return this.gmbService.deleteTemplate(id);
    }
}

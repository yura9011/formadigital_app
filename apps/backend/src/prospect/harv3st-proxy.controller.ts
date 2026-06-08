import { Body, Controller, Delete, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('api/harv3st/api')
export class Harv3stProxyController {
  private readonly baseUrl = process.env.HARV3ST_URL || 'http://127.0.0.1:5050';

  private async forward(path: string, res: Response, method = 'GET', body?: unknown): Promise<void> {
    try {
      const response = await fetch(this.baseUrl + path, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const contentType = response.headers.get('content-type');
      const disposition = response.headers.get('content-disposition');
      if (contentType) res.setHeader('Content-Type', contentType);
      if (disposition) res.setHeader('Content-Disposition', disposition);
      res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.status(502).json({ status: 'error', message: 'Harv3st unavailable' });
    }
  }

  private withQuery(path: string, query: Record<string, string | string[]>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
      else if (value !== undefined) params.set(key, value);
    }
    const encoded = params.toString();
    return encoded ? path + '?' + encoded : path;
  }

  @Get('status')
  status(@Res() res: Response) { return this.forward('/api/status', res); }

  @Post('search')
  search(@Body() body: unknown, @Res() res: Response) { return this.forward('/api/search', res, 'POST', body); }

  @Get('data')
  data(@Res() res: Response) { return this.forward('/api/data', res); }

  @Get('data/scored')
  scored(@Res() res: Response) { return this.forward('/api/data/scored', res); }

  @Get('data/filter')
  filtered(@Query() query: Record<string, string | string[]>, @Res() res: Response) {
    return this.forward(this.withQuery('/api/data/filter', query), res);
  }

  @Post('collect')
  collect(@Body() body: unknown, @Res() res: Response) { return this.forward('/api/collect', res, 'POST', body); }

  @Post('campaign')
  campaign(@Body() body: unknown, @Res() res: Response) { return this.forward('/api/campaign', res, 'POST', body); }

  @Get('campaign/status')
  campaignStatus(@Res() res: Response) { return this.forward('/api/campaign/status', res); }

  @Post('campaign/stop')
  stopCampaign(@Res() res: Response) { return this.forward('/api/campaign/stop', res, 'POST'); }

  @Get('export/csv')
  exportCsv(@Res() res: Response) { return this.forward('/api/export/csv', res); }

  @Delete('data/clear')
  clearData(@Res() res: Response) { return this.forward('/api/data/clear', res, 'DELETE'); }
}

import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { GoogleAuthModule } from '../google-auth/google-auth.module';

@Module({
    imports: [GoogleAuthModule],
    controllers: [CalendarController],
    providers: [CalendarService],
})
export class CalendarModule { }

import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LogginComponent } from './loggin/loggin.component';
import { PreguntasFrecComponent } from './preguntas-frec/preguntas-frec.component';

export const routes: Routes = [
    {path: "", component: HomeComponent},
    {path: "loggin", component: LogginComponent},
    {path:"preguntas_frecuentes", component: PreguntasFrecComponent }
];

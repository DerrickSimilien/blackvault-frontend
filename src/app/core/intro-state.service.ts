import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IntroStateService {
  get hasPlayedIntro(): boolean {
    return localStorage.getItem('bv_intro_played') === 'true';
  }

  set hasPlayedIntro(value: boolean) {
    localStorage.setItem('bv_intro_played', String(value));
  }
}
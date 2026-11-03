import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { LifeMapEntry, LifeMapService } from '../../services/life-map.service';
import { AuthService } from '../../services/auth.service';
import { TimelineComponent } from './timeline.component';

/** FileReader stand-in whose completion each test triggers explicitly. */
class ControlledFileReader {
  public static instances: ControlledFileReader[] = [];
  public result: string | null = null;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;

  constructor() {
    ControlledFileReader.instances.push(this);
  }

  public readAsDataURL(): void {
    // Completed manually via complete().
  }

  public complete(dataUrl = 'data:image/png;base64,AAAA'): void {
    this.result = dataUrl;
    this.onload?.();
  }
}

describe('TimelineComponent editing', () => {
  let component: TimelineComponent;
  let uploads: Subject<string>[];
  let lifeMap: {
    getEntries: jest.Mock<Observable<LifeMapEntry[]>>;
    uploadImage: jest.Mock<Observable<string>>;
    createEntry: jest.Mock;
    updateEntry: jest.Mock;
  };
  const authenticated$ = new BehaviorSubject<boolean>(true);
  const realFileReader = window.FileReader;
  const setFileReader = (ctor: unknown): void => {
    Object.defineProperty(window, 'FileReader', { value: ctor, writable: true, configurable: true });
  };

  const selectFile = (): void => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })] });
    component.onImageSelected({ target: input } as unknown as Event);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    ControlledFileReader.instances = [];
    setFileReader(ControlledFileReader);
    uploads = [];
    lifeMap = {
      getEntries: jest.fn(() => of([])),
      uploadImage: jest.fn(() => {
        const s = new Subject<string>();
        uploads.push(s);
        return s.asObservable();
      }),
      createEntry: jest.fn(() => of({})),
      updateEntry: jest.fn(() => of({})),
    };
    authenticated$.next(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: LifeMapService, useValue: lifeMap },
        { provide: AuthService, useValue: { authenticated$ } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new TimelineComponent());
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
    setFileReader(realFileReader);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('blocks saving while an image upload is in flight, then attaches it to the draft', () => {
    component.openAddForm();
    selectFile();
    ControlledFileReader.instances[0].complete();
    expect(component.pendingUploads).toBe(1);

    component.saveEntry();
    expect(component.formError).toMatch(/wait for image uploads/i);
    expect(lifeMap.createEntry).not.toHaveBeenCalled();

    uploads[0].next('photo.png');
    uploads[0].complete();
    expect(component.pendingUploads).toBe(0);
    expect(component.entryForm.images).toEqual(['photo.png']);
  });

  it('discards upload results that arrive after the draft was closed or replaced', () => {
    component.openAddForm();
    selectFile();
    ControlledFileReader.instances[0].complete();
    component.closeForm();
    component.openAddForm();

    uploads[0].next('stale.png');
    uploads[0].complete();

    expect(component.entryForm.images).toEqual([]);
    expect(component.pendingUploads).toBe(0);
  });

  it('ignores a file read that finishes after the draft changed', () => {
    component.openAddForm();
    selectFile();
    component.closeForm();
    ControlledFileReader.instances[0].complete();
    expect(lifeMap.uploadImage).not.toHaveBeenCalled();
  });

  it('keeps the map mounted when refreshing entries after the map is initialized', () => {
    expect(component.isLoading).toBe(false);
    (component as unknown as { mapInitialized: boolean }).mapInitialized = true;
    lifeMap.getEntries.mockReturnValue(new Subject<LifeMapEntry[]>().asObservable());

    (component as unknown as { loadEntries(): void }).loadEntries();

    expect(component.isLoading).toBe(false);
  });

  it('shows the loading state on the first load before the map exists', () => {
    lifeMap.getEntries.mockReturnValue(new Subject<LifeMapEntry[]>().asObservable());
    (component as unknown as { loadEntries(): void }).loadEntries();
    expect(component.isLoading).toBe(true);
  });

  it('Escape cancels map picking first while keeping the draft, then closes the editor', () => {
    component.openAddForm();
    component.entryForm.title = 'Draft';
    component.togglePickLocation();
    expect(component.pickingLocation).toBe(true);

    component.onEscape();
    expect(component.pickingLocation).toBe(false);
    expect(component.showEntryForm).toBe(true);
    expect(component.entryForm.title).toBe('Draft');

    component.onEscape();
    expect(component.showEntryForm).toBe(false);
  });

  it('does not close the editor on backdrop clicks while picking a location', () => {
    component.openAddForm();
    component.togglePickLocation();
    const overlay = document.createElement('div');
    component.onOverlayClick({ target: overlay, currentTarget: overlay } as unknown as Event);
    expect(component.showEntryForm).toBe(true);
  });

  it('restores focus to the element that opened the editor', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    component.openAddForm();
    (document.activeElement as HTMLElement).blur();
    component.closeForm();
    jest.runOnlyPendingTimers();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('closes the editor when the session ends', () => {
    component.openAddForm();
    authenticated$.next(false);
    expect(component.showEntryForm).toBe(false);
  });
});

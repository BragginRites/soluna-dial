import { SolunaDialSettings } from './solunaDialSettings.js';

/**
 * Main class for the Soluna Dial module.
 * Handles the creation and management of the PIXI.js based time and environment display.
 */
class SolunaDial {
  constructor() {
    /**
     * The module ID.
     * @type {string}
     * @private
     */
    this._moduleId = 'soluna-dial';
    console.log(`${this._moduleId} | Initializing Soluna Dial`);

    // --- Base (1.0 Scale) Dimensions and Values ---
    this.BASE_HUD_WIDTH = 400;
    this.BASE_PRIMARY_FONT_SIZE = 18; // For time, calendar, weather
    this.BASE_ICON_FONT_SIZE = 18; // For time advancement buttons
    this.BASE_TIME_BAR_TEXT_TOP_PADDING = 7;
    this.BASE_TIME_BAR_TEXT_BOTTOM_PADDING = 7;
    this.BASE_MAIN_HUD_AREA_HEIGHT = 150;
    this.BASE_CORNER_RADIUS = 15;
    this.BASE_PADDING = 10;
    this.BASE_BUTTON_PADDING = 5;
    this.BASE_MARKER_SIZE = 10;
    this.BASE_WEATHER_TEXT_PADDING_TOP = 5;
    // Note: DIAL_RADIUS is derived, so its base components (MAIN_HUD_AREA_HEIGHT, PADDING) will scale.

    // --- Working (Scaled) Dimensions and Values --- 
    // These will be calculated by _calculateScaledDimensions()
    this.HUD_WIDTH = 0;
    this.primaryFontSize = 0;
    this.calendarFontSize = 0;
    this.iconFontSize = 0;
    this.TIME_BAR_TEXT_TOP_PADDING = 0;
    this.TIME_BAR_TEXT_BOTTOM_PADDING = 0;
    this.TIME_BAR_HEIGHT = 0;
    this.MAIN_HUD_AREA_HEIGHT = 0;
    this.TOTAL_HUD_HEIGHT = 0;
    this.CORNER_RADIUS = 0;
    this.PADDING = 0;
    this.BUTTON_PADDING = 0;
    this.DIAL_CENTER_X = 0;
    this.DIAL_TOP_EDGE_Y_IN_MAIN_AREA = 0; // Remains 0, it's an offset within its own logic
    this.DIAL_RADIUS = 0;
    this.MAIN_HUD_AREA_Y_OFFSET = 0;
    this.DIAL_ARC_CENTER_Y = 0;
    this.MARKER_SIZE = 0;
    this.weatherTextPaddingTop = 0;

    // Other properties
    this._pixiApp = null;
    this._mainContainer = null;
    this._timeCalendarContainer = null;
    this._timeText = null;
    this._timeCalendarSeparator = null;
    this._calendarText = null;
    this._timeBarGraphic = null;
    this._mainHudAreaGraphic = null;
    this._radialDialBackground = null;
    this._dialMarker = null;
    this._weatherText = null;

    this.DEFAULT_FONT_FAMILY = 'Signika'; // Base font family, does not scale
    this.MARKER_COLOR = 0xFFFFFF;       // Base color, does not scale
    this._currentWeather = 'CLEAR';
    this._topBarOpacity = 0.7;          // Opacity, does not scale with UI size
    this._dialImageOpacity = 1.0;       // Opacity
    this._dialMarkerColor = this.MARKER_COLOR; // Can be changed by setting, not scaled here
    this._dialMarkerOpacity = 1.0;      // Opacity
    this._globalFontFamily = this.DEFAULT_FONT_FAMILY;
    this._globalUiScale = 1.0;          // Initial scale
    this._globalFontOpacity = 1.0;      // Initial font opacity
    this._displaySeconds = false;       // Whether to display seconds in the time

    this.ICON_REWIND_HOUR = '\uf04b';
    this.ICON_REWIND_DAY = '\uf049';
    this.ICON_ADVANCE_HOUR = '\uf04b';
    this.ICON_ADVANCE_DAY = '\uf050';

    this._rewindHourButton = null;
    this._rewindDayButton = null;
    this._advanceHourButton = null;
    this._advanceDayButton = null;

    this._dialGradientTexture = null;
    this._dialGradientSprite = null;
    this._dialMask = null;
    this._dialGradientContainer = null;

    this.GRADIENT_DEEP_BLUE = '#000030';
    this.GRADIENT_PINK = '#FF6AD5';
    this.GRADIENT_ORANGE = '#FF9900';
    
    this.SUNRISE_HOUR = 6;
    this.SUNSET_HOUR = 18;
    this.DAY_COLOR = 0xFF8C00;
    this.NIGHT_COLOR = 0x00008B;

    // Initial calculation of dimensions based on default scale
    this._calculateScaledDimensions();

    // Initialize PIXI app after dimensions are calculated
    this._initPIXIApp();

    // Draw all elements
    this._redrawAllElements();

    // Initial data updates
    this.updateTimeDisplay();
    this.updateCalendarDisplay();
    this._updateDialRotation();
    
    // Load weather from world setting after the world is ready
    if (game.ready) {
      this._loadWeatherFromFlag();
    } else {
      Hooks.once('ready', () => {
        this._loadWeatherFromFlag();
      });
    }
    
    // Ensure weather text is on top after initial setup
    setTimeout(() => {
      this._ensureWeatherTextOnTop();
    }, 100);

    // Hooks
    Hooks.on('updateWorldTime', (worldTime, dt) => {
      this.updateTimeDisplay();
      this.updateCalendarDisplay();
      this._updateDialRotation();
    });

    if (game.modules.get('foundryvtt-simple-calendar')?.active && typeof SimpleCalendar !== 'undefined' && SimpleCalendar.api) {
      Hooks.on('SimpleCalendar.DateTimeChange', (data) => {
        console.log(`${this._moduleId} | SimpleCalendar.DateTimeChange hook fired.`, data);
        this.updateCalendarDisplay();
        this._updateDialRotation();
      });
    }

    // Socket communication for real-time weather updates
    game.socket.on(`module.${this._moduleId}`, (data) => {
      if (data.type === 'weather-update' && data.userId !== game.user.id) {
        console.log(`${this._moduleId} | Received weather update via socket:`, data.weather);
        this._currentWeather = data.weather;
        this.updateWeatherDisplay(data.weather);
        // Ensure weather text is on top after update
        this._ensureWeatherTextOnTop();
      }
    });
  }

  _calculateScaledDimensions() {
    const scale = this._globalUiScale;

    this.HUD_WIDTH = Math.round(this.BASE_HUD_WIDTH * scale);
    this.primaryFontSize = Math.max(8, Math.round(this.BASE_PRIMARY_FONT_SIZE * scale)); // Ensure minimum font size
    this.calendarFontSize = this.primaryFontSize; 
    this.iconFontSize = Math.max(10, Math.round(this.BASE_ICON_FONT_SIZE * scale)); // Ensure minimum icon size
    this.TIME_BAR_TEXT_TOP_PADDING = Math.round(this.BASE_TIME_BAR_TEXT_TOP_PADDING * scale);
    this.TIME_BAR_TEXT_BOTTOM_PADDING = Math.round(this.BASE_TIME_BAR_TEXT_BOTTOM_PADDING * scale);
    this.TIME_BAR_HEIGHT = this.TIME_BAR_TEXT_TOP_PADDING + this.primaryFontSize + this.TIME_BAR_TEXT_BOTTOM_PADDING;
    
    this.MAIN_HUD_AREA_HEIGHT = Math.round(this.BASE_MAIN_HUD_AREA_HEIGHT * scale);
    this.TOTAL_HUD_HEIGHT = this.TIME_BAR_HEIGHT + this.MAIN_HUD_AREA_HEIGHT;
    this.CORNER_RADIUS = Math.round(this.BASE_CORNER_RADIUS * scale);
    this.PADDING = Math.round(this.BASE_PADDING * scale);
    this.BUTTON_PADDING = Math.round(this.BASE_BUTTON_PADDING * scale);
    
    this.DIAL_CENTER_X = this.HUD_WIDTH / 2;
    this.MAIN_HUD_AREA_Y_OFFSET = this.TIME_BAR_HEIGHT;
    this.DIAL_RADIUS = (this.MAIN_HUD_AREA_HEIGHT - this.PADDING) * 0.8; // Simplified, ensure PADDING scales
    this.DIAL_ARC_CENTER_Y = this.MAIN_HUD_AREA_Y_OFFSET; // Position at top of main area, not center

    this.MARKER_SIZE = Math.max(5, Math.round(this.BASE_MARKER_SIZE * scale));
    this.weatherTextPaddingTop = Math.round(this.BASE_WEATHER_TEXT_PADDING_TOP * scale);
    console.log(`${this._moduleId} | Calculated scaled dimensions with scale ${scale}. HUD_WIDTH: ${this.HUD_WIDTH}, TIME_BAR_HEIGHT: ${this.TIME_BAR_HEIGHT}`);
  }

  _redrawAllElements() {
    // Clear the main container before redrawing (optional, as draw methods often handle their own clearing/destroying)
    // if (this._mainContainer) this._mainContainer.removeChildren(); 

    // Clean up interactive area if it exists
    if (this._dialInteractiveArea) {
      this._dialInteractiveArea.destroy();
      this._dialInteractiveArea = null;
    }

    // Graphics objects need to be redrawn as their sizes/positions depend on scaled dimensions
    this._drawTimeBar();
    this._drawMainHudArea(); // Mostly for positioning logic if it had content
    this._drawRadialDialBackground();
    this._drawDialMarker();

    // Text objects and complex sprites with masks need full recreation or careful updates
    // The current _draw... methods for these handle destruction and recreation
    this._drawTimeAndCalendarGroup();
    this._drawTimeAdvanceControls();
    this._createDialGradientAndMask(); // This recreates sprite and mask
    this._drawWeatherText(); // Draw weather text AFTER dial image to ensure it's on top
    this._createDialInteractiveArea(); // Create interactive area for GM weather changes

    // Ensure weather text is always on top (highest z-index) after all elements are drawn
    this._ensureWeatherTextOnTop();

    console.log(`${this._moduleId} | All elements redrawn.`);
    
    // Final check to ensure weather text is on top
    setTimeout(() => {
      this._ensureWeatherTextOnTop();
    }, 50);
  }

  _initPIXIApp() {
    if (this._pixiApp) { // If resizing an existing app
        this._pixiApp.renderer.resize(this.HUD_WIDTH, this.TOTAL_HUD_HEIGHT);
    } else {
    this._pixiApp = new PIXI.Application({
            width: this.HUD_WIDTH, // Use scaled width
            height: this.TOTAL_HUD_HEIGHT, // Use scaled height
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });
    this._pixiApp.view.id = 'soluna-dial-canvas';
    this._pixiApp.view.classList.add('soluna-dial-canvas-positioned'); // Added class for CSS positioning
    document.body.appendChild(this._pixiApp.view);
    this._mainContainer = new PIXI.Container();
    this._pixiApp.stage.addChild(this._mainContainer);
    }
    console.log(`${this._moduleId} | PIXI Application initialized/resized. W: ${this.HUD_WIDTH}, H: ${this.TOTAL_HUD_HEIGHT}`);
  }

  _drawTimeBar() {
    if (!this._mainContainer) return;
    if (this._timeBarGraphic) this._timeBarGraphic.clear();
    else {
      this._timeBarGraphic = new PIXI.Graphics();
      this._mainContainer.addChild(this._timeBarGraphic);
    }
    this._timeBarGraphic.beginFill(0x101010, this._topBarOpacity);
    this._timeBarGraphic.moveTo(0, 0);
    this._timeBarGraphic.lineTo(this.HUD_WIDTH, 0);
    this._timeBarGraphic.lineTo(this.HUD_WIDTH, this.TIME_BAR_HEIGHT - this.CORNER_RADIUS);
    this._timeBarGraphic.arcTo(this.HUD_WIDTH, this.TIME_BAR_HEIGHT, this.HUD_WIDTH - this.CORNER_RADIUS, this.TIME_BAR_HEIGHT, this.CORNER_RADIUS);
    this._timeBarGraphic.lineTo(this.CORNER_RADIUS, this.TIME_BAR_HEIGHT);
    this._timeBarGraphic.arcTo(0, this.TIME_BAR_HEIGHT, 0, this.TIME_BAR_HEIGHT - this.CORNER_RADIUS, this.CORNER_RADIUS);
    this._timeBarGraphic.closePath();
    this._timeBarGraphic.endFill();
    // console.log(`${this._moduleId} | Time bar drawn. Height: ${this.TIME_BAR_HEIGHT}px.`);
  }

  _drawMainHudArea() {
    if (!this._mainContainer) return;
    if (this._mainHudAreaGraphic) this._mainHudAreaGraphic.clear();
    else {
      this._mainHudAreaGraphic = new PIXI.Graphics();
      this._mainContainer.addChild(this._mainHudAreaGraphic);
    }
    // console.log(`${this._moduleId} | Main HUD area transparent container drawn.`);
  }

  _drawTimeAndCalendarGroup() {
    if (!this._mainContainer) return;
    if (this._timeCalendarContainer) {
        this._timeCalendarContainer.destroy({ children: true });
        this._timeCalendarContainer = null;
        this._timeText = null;
        this._timeCalendarSeparator = null;
        this._calendarText = null;
    }
    this._timeCalendarContainer = new PIXI.Container();
    this._mainContainer.addChild(this._timeCalendarContainer);

    const commonTextStyle = {
        fontFamily: this._globalFontFamily,
        fill: 'white',
        align: 'left',
        alpha: this._globalFontOpacity
    };

    const timeStyle = new PIXI.TextStyle({...commonTextStyle, fontSize: this.primaryFontSize});
    const calendarStyle = new PIXI.TextStyle({...commonTextStyle, fontSize: this.calendarFontSize});

    this._timeText = new PIXI.Text("HH:MM", timeStyle);
    this._timeText.anchor.set(0, 0.5);
    this._timeText.y = 0;
    this._timeText.alpha = this._globalFontOpacity; // Apply global font opacity
    this._timeCalendarContainer.addChild(this._timeText);

    // Use primaryFontSize for separator for consistency with time part
    this._timeCalendarSeparator = new PIXI.Text(" - ", new PIXI.TextStyle({
        fontFamily: this._globalFontFamily, 
        fontSize: this.primaryFontSize, 
        fill: 'white', 
        align: 'left'
    }));
    this._timeCalendarSeparator.anchor.set(0, 0.5);
    this._timeCalendarSeparator.y = 0;
    this._timeCalendarSeparator.alpha = this._globalFontOpacity; // Apply global font opacity
    this._timeCalendarContainer.addChild(this._timeCalendarSeparator);

    this._calendarText = new PIXI.Text("Calendar Loading...", calendarStyle);
    this._calendarText.anchor.set(0, 0.5);
    this._calendarText.y = 0;
    this._calendarText.alpha = this._globalFontOpacity; // Apply global font opacity
    this._timeCalendarContainer.addChild(this._calendarText);
    
    this._timeCalendarContainer.y = this.TIME_BAR_HEIGHT / 2;
    this._repositionElementsInTimeCalendarGroup();
    this._centerTimeCalendarGroup();
    // console.log(`${this._moduleId} | Time and Calendar group drawn.`);
  }

  _repositionElementsInTimeCalendarGroup() {
    if (!this._timeText || !this._timeCalendarSeparator || !this._calendarText) return;
    this._timeText.updateText(true);
    this._timeCalendarSeparator.updateText(true);
    this._calendarText.updateText(true);
    this._timeText.x = 0;
    this._timeCalendarSeparator.x = this._timeText.width;
    this._calendarText.x = this._timeText.width + this._timeCalendarSeparator.width;
  }

  _centerTimeCalendarGroup() {
    if (!this._timeCalendarContainer) return;
    // Ensure children are up-to-date for bounds calculation
    this._repositionElementsInTimeCalendarGroup(); 
    this._timeCalendarContainer.x = (this.HUD_WIDTH - this._timeCalendarContainer.getBounds(false).width) / 2;
  }

  _drawTimeAdvanceControls() {
    if (!this._mainContainer) return;
    // Destroy old buttons if they exist
    if (this._rewindHourButton) this._rewindHourButton.destroy();
    if (this._rewindDayButton) this._rewindDayButton.destroy();
    if (this._advanceHourButton) this._advanceHourButton.destroy();
    if (this._advanceDayButton) this._advanceDayButton.destroy();

    // Only show buttons for GMs
    if (!game.user.isGM) return;

    const iconStyle = new PIXI.TextStyle({
      fontFamily: 'Font Awesome 5 Free',
      fontSize: this.iconFontSize, // Use scaled icon font size
      fill: '#FFFFFF',
      align: 'center',
      alpha: this._globalFontOpacity
    });
    const createButton = (iconChar, tooltipText, clickHandler) => {
      const button = new PIXI.Text(iconChar, iconStyle.clone());
      button.anchor.set(0.5);
      button.y = this.TIME_BAR_HEIGHT / 2;
      button.interactive = true;
      button.buttonMode = true;
      button.on('pointertap', clickHandler);
      button.on('pointerover', () => { if(this._pixiApp && this._pixiApp.view) this._pixiApp.view.title = tooltipText; });
      button.on('pointerout', () => { if(this._pixiApp && this._pixiApp.view) this._pixiApp.view.title = ''; });
      button.alpha = this._globalFontOpacity; // Apply global font opacity
      this._mainContainer.addChild(button);
      return button;
    };
    this._rewindHourButton = createButton(this.ICON_REWIND_HOUR, "Rewind 1 Hour", () => game.time.advance(-3600));
    this._rewindHourButton.scale.x = -1;
    this._rewindHourButton.x = this.PADDING + (this._rewindHourButton.width / 2);
    this._rewindDayButton = createButton(this.ICON_REWIND_DAY, "Rewind 1 Day", () => game.time.advance(-86400));
    this._rewindDayButton.x = this._rewindHourButton.x + (this._rewindHourButton.width / 2) + this.BUTTON_PADDING + (this._rewindDayButton.width / 2);
    this._advanceHourButton = createButton(this.ICON_ADVANCE_HOUR, "Advance 1 Hour", () => game.time.advance(3600));
    this._advanceHourButton.x = this.HUD_WIDTH - this.PADDING - (this._advanceHourButton.width / 2);
    this._advanceDayButton = createButton(this.ICON_ADVANCE_DAY, "Advance 1 Day", () => game.time.advance(86400));
    this._advanceDayButton.x = this._advanceHourButton.x - (this._advanceHourButton.width / 2) - this.BUTTON_PADDING - (this._advanceDayButton.width / 2);
    // console.log(`${this._moduleId} | Time advance controls drawn.`);
  }

  _drawWeatherText() {
    if (!this._mainContainer) return;
    if (this._weatherText) this._weatherText.destroy();
    const style = new PIXI.TextStyle({
      fontFamily: this._globalFontFamily,
      fontSize: this.primaryFontSize, // Use scaled primary font size (or a specific weather font size if defined)
      fill: 'white',
      align: 'center',
      fontWeight: 'bold',
      alpha: this._globalFontOpacity,
      // Add shadow/outline for better visibility
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 1,
      dropShadowAngle: Math.PI / 4,
      dropShadowDistance: 1,
      stroke: '#000000',
      strokeThickness: 1
    });
    this._weatherText = new PIXI.Text(this._currentWeather, style);
    this._weatherText.anchor.set(0.5, 0.5);
    this._weatherText.x = this.DIAL_CENTER_X;
    this._weatherText.y = this.DIAL_ARC_CENTER_Y + (this.primaryFontSize / 2) + this.weatherTextPaddingTop;
    this._weatherText.alpha = this._globalFontOpacity; // Apply global font opacity
    
    // Weather text right-click is handled by dial container or interactive area only
    // Remove individual weather text right-click to prevent double dialogs
    
    this._mainContainer.addChild(this._weatherText);
    
    // Ensure weather text is on top
    this._ensureWeatherTextOnTop();
    
    // console.log(`${this._moduleId} | Weather text element created.`);
  }

  _drawRadialDialBackground() {
    if (!this._mainContainer) return;
    if (this._radialDialBackground) this._radialDialBackground.clear();
    else this._radialDialBackground = new PIXI.Graphics();
    const arcCenterX = this.DIAL_CENTER_X;
    const arcCenterY = this.DIAL_ARC_CENTER_Y;
    this._radialDialBackground.arc(arcCenterX, arcCenterY, this.DIAL_RADIUS, 0, Math.PI); 
    this._mainContainer.addChild(this._radialDialBackground); 
    // console.log(`${this._moduleId} | Radial dial border drawn. arcCenterY: ${arcCenterY}`);
  }

  _createDialGradientAndMask() {
    if (!this._mainContainer || this.DIAL_RADIUS <= 0) return;
    if (this._dialGradientContainer) {
        this._dialGradientContainer.destroy({children: true});
        this._dialGradientContainer = null;
        this._dialGradientSprite = null;
        this._dialMask = null;
    }
    // Use custom dial image if set, otherwise use default
    const customImage = game.settings.get(this._moduleId, 'customDialImage');
    const imagePath = customImage || 'modules/soluna-dial/assets/dial.png';
    
    try {
      this._dialGradientTexture = PIXI.Texture.from(imagePath);
      if (!this._dialGradientTexture || this._dialGradientTexture === PIXI.Texture.EMPTY) {
        // Don't create sprite if texture fails - but create interactive area for GMs
        console.log(`${this._moduleId} | Dial texture not found, creating interactive area only`);
        this._createDialInteractiveArea();
        return;
      } else {
        this._dialGradientSprite = new PIXI.Sprite(this._dialGradientTexture);
      }
    } catch (error) {
      console.log(`${this._moduleId} | Error loading dial texture, creating interactive area only`);
      this._createDialInteractiveArea();
      return;
    }
    // Apply custom scale if set
    const customScale = game.settings.get(this._moduleId, 'customDialImageScale') || 1.0;
    const scaledSize = this.DIAL_RADIUS * 2 * customScale;
    
    this._dialGradientSprite.width = scaledSize;
    this._dialGradientSprite.height = scaledSize;
    this._dialGradientSprite.alpha = this._dialImageOpacity;
    this._dialGradientSprite.anchor.set(0.5);
    this._dialMask = new PIXI.Graphics();
    this._dialMask.beginFill(0xFFFFFF);
    this._dialMask.arc(0, 0, this.DIAL_RADIUS, 0, Math.PI, false);
    this._dialMask.closePath();
    this._dialMask.endFill();
    this._dialGradientContainer = new PIXI.Container();
    this._dialGradientContainer.x = this.DIAL_CENTER_X;
    this._dialGradientContainer.y = this.DIAL_ARC_CENTER_Y;
    this._dialGradientContainer.addChild(this._dialGradientSprite);
    this._dialGradientContainer.addChild(this._dialMask);
    this._dialGradientContainer.mask = this._dialMask;
    
    // Add right-click interaction for GMs to change weather
    if (game.user.isGM) {
      this._dialGradientContainer.interactive = true;
      this._dialGradientContainer.on('rightclick', (event) => {
        event.stopPropagation();
        this._showWeatherChangeDialog();
      });
    }
    
    this._mainContainer.addChild(this._dialGradientContainer);
    // console.log(`${this._moduleId} | Dial gradient created. Y: ${this._dialGradientContainer.y}`);
  }

  /**
   * Creates an invisible interactive area over the dial region for GM weather changes
   */
  _createDialInteractiveArea() {
    if (!this._mainContainer || !game.user.isGM) return;
    
    // Clean up existing interactive area
    if (this._dialInteractiveArea) {
      this._dialInteractiveArea.destroy();
    }
    
    // Create invisible graphics for interaction
    this._dialInteractiveArea = new PIXI.Graphics();
    this._dialInteractiveArea.beginFill(0x000000, 0); // Transparent
    this._dialInteractiveArea.arc(0, 0, this.DIAL_RADIUS, 0, Math.PI, false);
    this._dialInteractiveArea.endFill();
    
    // Position and make interactive
    this._dialInteractiveArea.x = this.DIAL_CENTER_X;
    this._dialInteractiveArea.y = this.DIAL_ARC_CENTER_Y;
    this._dialInteractiveArea.interactive = true;
    this._dialInteractiveArea.on('rightclick', (event) => {
      event.stopPropagation();
      this._showWeatherChangeDialog();
    });
    
    this._mainContainer.addChild(this._dialInteractiveArea);
    console.log(`${this._moduleId} | Dial interactive area created for GM weather changes`);
  }



  _drawDialMarker() {
    if (!this._mainContainer) return;
    if (this._dialMarker) this._dialMarker.clear();
    else this._dialMarker = new PIXI.Graphics();
    const markerX = this.DIAL_CENTER_X;
    const markerYOffset = this.MARKER_SIZE / 2; // Center of the diamond for y positioning
    const markerBottomTipY = this.DIAL_ARC_CENTER_Y + this.DIAL_RADIUS;
    this._dialMarker.beginFill(this._dialMarkerColor, this._dialMarkerOpacity);
    this._dialMarker.moveTo(markerX, markerBottomTipY); 
    this._dialMarker.lineTo(markerX + this.MARKER_SIZE / 2, markerBottomTipY - this.MARKER_SIZE / 2);
    this._dialMarker.lineTo(markerX, markerBottomTipY - this.MARKER_SIZE);
    this._dialMarker.lineTo(markerX - this.MARKER_SIZE / 2, markerBottomTipY - this.MARKER_SIZE / 2);
    this._dialMarker.closePath();
    this._dialMarker.endFill();
    this._mainContainer.addChild(this._dialMarker);
    // console.log(`${this._moduleId} | Dial marker drawn.`);
  }

  _updateDialRotation() {
    if (!this._dialGradientSprite) return;
    const worldTime = game.time.worldTime;
    const currentHour = (worldTime / 3600) % 24;
    const baseRotation = (currentHour / 24) * Math.PI * 2;
    
    // Get custom angle offset from settings (in degrees) and convert to radians
    const angleOffsetDegrees = game.settings.get(this._moduleId, 'customDialImageAngleOffset') || 90;
    const offsetRotation = (angleOffsetDegrees * Math.PI) / 180;
    
    this._dialGradientSprite.rotation = baseRotation + offsetRotation;
  }

  updateTimeDisplay() {
    if (!this._timeText) return;
    const worldTime = game.time.worldTime;
    const hours = Math.floor(worldTime / 3600) % 24;
    const minutes = Math.floor((worldTime % 3600) / 60);
    let timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    if (this._displaySeconds) {
      const seconds = Math.floor(worldTime % 60);
      timeString += `:${String(seconds).padStart(2, '0')}`;
    }
    this._timeText.text = timeString;
    this._repositionElementsInTimeCalendarGroup();
    this._centerTimeCalendarGroup();
  }

  updateCalendarDisplay() {
    if (!this._calendarText) return;
    if (game.modules.get('foundryvtt-simple-calendar')?.active && SimpleCalendar?.api) {
      try {
        const currentDateTime = SimpleCalendar.api.currentDateTimeDisplay();
        let displayDate = 'SC N/A';
        if (currentDateTime) {
          displayDate = currentDateTime.date;
          if (currentDateTime.day && currentDateTime.monthName && currentDateTime.year) {
            const yearPrefix = currentDateTime.yearPrefix || "";
            const yearPostfix = currentDateTime.yearPostfix || "";
            displayDate = `${currentDateTime.day} ${currentDateTime.monthName}, ${yearPrefix}${currentDateTime.year}${yearPostfix}`.trim().replace(/,\s*$/, "");
          } else if (!currentDateTime.date) {
            displayDate = 'SC: No date';
          }
        } else {
          displayDate = 'SC: No object';
        }
        this._calendarText.text = displayDate;
      } catch (e) {
        this._calendarText.text = 'SC: API Err';
      }
    } else {
      this._calendarText.text = 'SC not active';
    }
    this._repositionElementsInTimeCalendarGroup();
    this._centerTimeCalendarGroup();
  }

  /**
   * Shows a dialog for GMs to change the weather condition
   */
  async _showWeatherChangeDialog() {
    if (!game.user.isGM) return;

    const currentWeather = this._currentWeather;
    
    // Common weather conditions for quick selection
    const weatherOptions = [
      'Clear', 'Cloudy', 'Overcast', 'Rainy', 'Stormy', 'Foggy', 
      'Snowy', 'Windy', 'Hot', 'Cold', 'Humid', 'Dry'
    ];

    // Create options HTML
    const optionsHTML = weatherOptions.map(weather => 
      `<option value="${weather}" ${weather.toLowerCase() === currentWeather.toLowerCase() ? 'selected' : ''}>${weather}</option>`
    ).join('');

    const content = `
      <form>
        <div class="form-group">
          <label for="weather-select">Quick Select:</label>
          <select id="weather-select" style="width: 100%; margin-bottom: 10px;">
            ${optionsHTML}
          </select>
        </div>
        <div class="form-group">
          <label for="weather-custom">Custom Weather:</label>
          <input type="text" id="weather-custom" placeholder="Enter custom weather..." style="width: 100%;" value="${currentWeather}">
        </div>
      </form>
    `;

    new Dialog({
      title: "Change Weather Condition",
      content: content,
      buttons: {
        update: {
          label: "Update Weather",
          callback: (html) => {
            const customInput = html.find('#weather-custom')[0].value.trim();
            const selectValue = html.find('#weather-select')[0].value;
            
            // Use custom input if provided, otherwise use selected value
            const newWeather = customInput || selectValue;
            
            if (newWeather && newWeather !== currentWeather) {
              // Update local weather first
              this._currentWeather = newWeather;
              this.updateWeatherDisplay(newWeather);
              ui.notifications.info(`Weather changed to: ${newWeather}`);
              
              // Save weather to world setting for persistence
              this._saveWeatherToFlag(newWeather);
              
              // Broadcast to all other clients via socket
              game.socket.emit(`module.${this._moduleId}`, {
                type: 'weather-update',
                weather: newWeather,
                userId: game.user.id // Include sender ID to avoid echo
              });
            }
          }
        },
        cancel: {
          label: "Cancel"
        }
      },
      render: (html) => {
        // Update custom input when selection changes
        html.find('#weather-select').change((event) => {
          html.find('#weather-custom')[0].value = event.target.value;
        });
      },
      default: "update"
    }).render(true);
  }

  /**
   * Load weather from world setting on initialization
   */
  _loadWeatherFromFlag() {
    const savedWeather = game.settings.get(this._moduleId, 'currentWeather');
    if (savedWeather) {
      this._currentWeather = savedWeather;
      console.log(`${this._moduleId} | Loaded weather from world setting: ${savedWeather}`);
    } else {
      console.log(`${this._moduleId} | No saved weather found, using default: ${this._currentWeather}`);
    }
    this.updateWeatherDisplay(this._currentWeather);
    // Force weather text to top after loading
    this._ensureWeatherTextOnTop();
  }

  /**
   * Save weather to world setting for persistence
   */
  async _saveWeatherToFlag(weather) {
    try {
      await game.settings.set(this._moduleId, 'currentWeather', weather);
      console.log(`${this._moduleId} | Saved weather to world setting: ${weather}`);
    } catch (error) {
      console.error(`${this._moduleId} | Error saving weather to world setting:`, error);
    }
  }

  updateWeatherDisplay(newStatus) {
    if (!this._weatherText) return;
    if (typeof newStatus === 'string') this._currentWeather = newStatus;
    this._weatherText.text = this._currentWeather.toUpperCase();
    
    // Ensure weather text is visible and on top after update
    this._ensureWeatherTextOnTop();
  }

  /**
   * Ensures weather text is always on top of all other elements
   */
  _ensureWeatherTextOnTop() {
    if (this._weatherText && this._mainContainer) {
      this._mainContainer.setChildIndex(this._weatherText, this._mainContainer.children.length - 1);
      // Also ensure it's visible
      this._weatherText.visible = true;
      this._weatherText.alpha = this._globalFontOpacity;
      console.log(`${this._moduleId} | Weather text moved to top, z-index: ${this._mainContainer.children.length - 1}`);
    }
  }

  static onReady() {
    console.log('Soluna Dial | Foundry VTT is ready.'); // Updated log
    if (!game.modules.get('soluna-dial').api) { // Updated module ID
      const hudAPI = new SolunaDial(); // Constructor now handles initial scale and draw
      game.modules.get('soluna-dial').api = hudAPI; // Updated module ID
      
      // Apply initial settings that might have been changed before this load
      // RESTORING THE ARRAY, with globalUiSize first
      const settingsToApply = [
          'globalUiSize', // Moved to the front for testing
          'masterHudToggle', 'hudTopPadding', 'globalFontFamily', 'globalFontOpacity', 'topBarOpacity',
          'toggleCalendarDisplay', 'toggleSecondsDisplay', 'dialImageOpacity', 'toggleDialMarker', 
          'dialMarkerColor', 'dialMarkerOpacity', 'toggleWeatherDisplay', 'customDialImage', 'customDialImageScale', 'customDialImageAngleOffset'
      ];
      settingsToApply.forEach(key => {
          const value = game.settings.get(hudAPI._moduleId, key);
          const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;

          // <<< ADDING DIAGNOSTIC LOGGING HERE >>>
          console.log(`${hudAPI._moduleId} | Applying setting from onReady: key='${key}', value='${value}' (type: ${typeof value}), setter='${setterName}'`);

          if (typeof value !== 'undefined' && typeof hudAPI[setterName] === 'function') {
              try {
                  hudAPI[setterName](value);
              } catch (e) {
                  console.error(`${hudAPI._moduleId} | Error applying setting '${key}' in onReady:`, e);
              }
          } else if (typeof hudAPI[setterName] !== 'function') {
              console.warn(`${hudAPI._moduleId} | Setter method '${setterName}' not found for key '${key}' during onReady application.`);
          } else if (typeof value === 'undefined') {
              // This case means game.settings.get() returned undefined, likely because the setting isn't registered
              // or has no default and was never saved. This is often expected for unregistered settings.
              console.log(`${hudAPI._moduleId} | Value for setting key '${key}' is undefined (likely not registered or no default). Skipping application.`);
          }
      });
      
      // Ensure weather is loaded and displayed correctly for all users
      setTimeout(() => {
        hudAPI._loadWeatherFromFlag();
      }, 200);
    }
  }

  setMasterHudToggle(visible) {
    // This is handled by the static onReady and the settings hook in SolunaDialSettings
    // If called on an instance, it should reflect the master toggle logic
    if (this._pixiApp && this._pixiApp.view) { // Ensure view exists
        if (visible) {
            // document.body.appendChild(this._pixiApp.view); // Re-add if fully removed, though class toggle is better
            this._pixiApp.view.classList.remove('soluna-dial-hidden');
        } else {
            this._pixiApp.view.classList.add('soluna-dial-hidden');
            // this._pixiApp.view.remove(); // Alternative: fully remove from DOM
        }
    } else if (visible && !this._pixiApp) {
        // This case means the HUD should be visible but doesn't exist yet.
        // It will be handled by the static onReady or settings system creating the instance.
        console.log(`${this._moduleId} | Master HUD toggle true, instance will be created by core logic if not present.`);
    }
    console.log(`${this._moduleId} | Master HUD visibility instructed to: ${visible}`);
  }

  setGlobalFontFamily(fontFamily) {
    if (typeof fontFamily === 'string' && fontFamily.trim() !== '') {
      this._globalFontFamily = fontFamily;
      // Font change requires full redraw of text elements
      this._redrawAllElements(); 
      this.updateTimeDisplay(); 
      this.updateCalendarDisplay();
      this.updateWeatherDisplay();
      this._updateDialRotation();
      console.log(`${this._moduleId} | Global font set to: ${fontFamily}`);
    } else {
      // Handle empty font family gracefully by using default
      if (fontFamily === '') {
        this._globalFontFamily = 'Signika'; // Use default font
        console.log(`${this._moduleId} | Empty font family provided, using default: Signika`);
      } else {
        console.warn(`${this._moduleId} | Invalid font family: ${fontFamily}`);
      }
    }
  }

  setHudTopPadding(paddingString) {
    // Use CSS variable for dynamic top padding
    document.documentElement.style.setProperty('--soluna-dial-top-padding', paddingString);
    console.log(`${this._moduleId} | HUD top padding CSS variable set to: ${paddingString}`);
  }

  setTopBarOpacity(alpha) {
    if (typeof alpha === 'number' && alpha >= 0 && alpha <= 1) {
      this._topBarOpacity = alpha;
      this._drawTimeBar(); // Only need to redraw the bar itself
    }
  }

  setToggleCalendarDisplay(visible) {
    if (this._calendarText) this._calendarText.visible = !!visible;
    if (this._timeCalendarSeparator) this._timeCalendarSeparator.visible = !!visible;
    this._repositionElementsInTimeCalendarGroup();
    this._centerTimeCalendarGroup();
    // console.log(`${this._moduleId} | Calendar display set to: ${visible}`);
  }

  setToggleWeatherDisplay(visible) {
    if (this._weatherText) {
      this._weatherText.visible = !!visible;
      // console.log(`${this._moduleId} | Weather display visibility set to: ${visible}`);
    }
  }

  setToggleDialMarker(visible) {
    if (this._dialMarker) this._dialMarker.visible = !!visible;
  }

  setDialImageOpacity(alpha) {
    if (typeof alpha === 'number' && alpha >= 0 && alpha <= 1) {
      this._dialImageOpacity = alpha;
      if (this._dialGradientSprite) {
        this._dialGradientSprite.alpha = this._dialImageOpacity;
      }
      console.log(`${this._moduleId} | Dial image opacity set to: ${alpha}`);
    } else {
      console.warn(`${this._moduleId} | Invalid Dial Image Opacity value: ${alpha}. Type: ${typeof alpha}`);
    }
  }

  setDialMarkerColor(colorValue) {
    let newColor;
    if (typeof colorValue === 'string') {
      try {
        newColor = Number(PIXI.utils.string2hex(colorValue));
      } catch (e) {
        console.warn(`${this._moduleId} | Invalid Dial Marker Color string: ${colorValue}`, e);
        return;
      }
    } else if (typeof colorValue === 'number') {
      newColor = colorValue;
    } else {
      console.warn(`${this._moduleId} | Invalid Dial Marker Color type: ${typeof colorValue}`);
      return;
    }

    this._dialMarkerColor = newColor;
    if (this._dialMarker) { // Redraw to apply new color
        this._drawDialMarker();
    }
  }

  setDialMarkerOpacity(alpha) {
    if (typeof alpha === 'number' && alpha >= 0 && alpha <= 1) {
      this._dialMarkerOpacity = alpha;
      if (this._dialMarker) { // Redraw to apply new opacity
          this._drawDialMarker();
      }
    } else {
      console.warn(`${this._moduleId} | Invalid Dial Marker Opacity value: ${alpha}. Type: ${typeof alpha}`);
    }
  }

  /**
   * Sets the global scale of the entire HUD, recalculates dimensions, 
   * resizes the PIXI app, and redraws all elements.
   * @param {number} scale - The scale factor (e.g., 1.0 for 100%, 0.8 for 80%).
   */
  setGlobalUiSize(scale) {
    if (typeof scale === 'number' && scale > 0) {
      // if (this._globalUiScale === scale) return; // No change // <<< REMOVED THIS LINE FOR TESTING

      console.log(`${this._moduleId} | Setting Global UI Size to: ${scale}`);
      this._globalUiScale = scale;
      this._calculateScaledDimensions();
      
      if (this._pixiApp) { // Resize renderer if app exists
          this._pixiApp.renderer.resize(this.HUD_WIDTH, this.TOTAL_HUD_HEIGHT);
          // Also update the canvas style if it's explicitly set, to match renderer
          this._pixiApp.view.style.width = `${this.HUD_WIDTH}px`;
          this._pixiApp.view.style.height = `${this.TOTAL_HUD_HEIGHT}px`;
      } else {
          // This case should ideally not be hit if onReady always creates the app first
          console.warn(`${this._moduleId} | PIXI App not initialized before scaling.`);
          this._initPIXIApp(); // Initialize with new dimensions if it wasn't
      }
      
      this._redrawAllElements();
      // After redrawing, ensure content is up-to-date
      this.updateTimeDisplay();
      this.updateCalendarDisplay();
      this.updateWeatherDisplay();
      this._updateDialRotation(); // Dial rotation doesn't depend on scale but good to keep updates together

    } else {
      console.warn(`${this._moduleId} | Invalid Global UI Size value: ${scale}`);
    }
  }

  /**
   * Sets the global opacity for all primary text elements.
   * @param {number} alpha - The opacity value (0.0 to 1.0).
   */
  setGlobalFontOpacity(alpha) {
    if (typeof alpha === 'number' && alpha >= 0 && alpha <= 1) {
      this._globalFontOpacity = alpha;
      const textElements = [
        this._timeText, this._calendarText, this._timeCalendarSeparator, 
        this._weatherText, this._rewindHourButton, this._rewindDayButton,
        this._advanceHourButton, this._advanceDayButton
      ];
      textElements.forEach(el => {
        if (el) el.alpha = this._globalFontOpacity;
      });
      // console.log(`${this._moduleId} | Global font opacity set to: ${alpha}`);
    } else {
      console.warn(`${this._moduleId} | Invalid Global Font Opacity value: ${alpha}. Type: ${typeof alpha}`);
    }
  }

  /**
   * Sets whether to display seconds in the time.
   * @param {boolean} display - True to display seconds, false otherwise.
   */
  setToggleSecondsDisplay(display) {
    this._displaySeconds = !!display;
    this.updateTimeDisplay(); // Refresh the time display to show/hide seconds
    // console.log(`${this._moduleId} | Display seconds set to: ${this._displaySeconds}`);
  }

  /**
   * Sets the custom dial image path.
   * @param {string} imagePath - The path to the custom dial image.
   */
  setCustomDialImage(imagePath) {
    console.log(`${this._moduleId} | Custom dial image set to: ${imagePath || 'default'}`);
    // Recreate the dial with the new image
    this._createDialGradientAndMask();
  }

  /**
   * Sets the custom dial image scale.
   * @param {number} scale - The scale factor for the custom dial image.
   */
  setCustomDialImageScale(scale) {
    if (typeof scale === 'number' && scale > 0) {
      console.log(`${this._moduleId} | Custom dial image scale set to: ${scale}`);
      // Recreate the dial with the new scale
      this._createDialGradientAndMask();
    } else {
      console.warn(`${this._moduleId} | Invalid custom dial image scale: ${scale}`);
    }
  }

  /**
   * Sets the custom dial image angle offset.
   * @param {number} angle - The angle offset in degrees (0-360).
   */
  setCustomDialImageAngleOffset(angle) {
    if (typeof angle === 'number' && angle >= 0 && angle <= 360) {
      console.log(`${this._moduleId} | Custom dial image angle offset set to: ${angle} degrees`);
      // Update the dial rotation with the new offset
      this._updateDialRotation();
    } else {
      console.warn(`${this._moduleId} | Invalid custom dial image angle offset: ${angle}`);
    }
  }
}

Hooks.once('init', () => {
  if (typeof SolunaDialSettings !== 'undefined' && SolunaDialSettings.registerSettings) { // Updated class name
    SolunaDialSettings.registerSettings();
  } else {
    console.error('Soluna Dial | SolunaDialSettings class or registerSettings method not found!'); // Updated log
  }
});

Hooks.once('ready', SolunaDial.onReady); // Updated class name 
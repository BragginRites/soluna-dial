const MODULE_ID = 'soluna-dial';

/**
 * Registers all core settings for the Soluna Dial module.
 */
export class SolunaDialSettings {
  static registerSettings() {
    console.log(`${MODULE_ID} | Registering core settings.`);

    // --- Display Toggle Settings ---
    game.settings.register(MODULE_ID, 'masterHudToggle', {
      name: 'Master HUD Toggle',
      hint: 'Globally enable or disable the Soluna Dial.',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: visible => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setMasterHudToggle(visible);
        }
      }
    });

    game.settings.register(MODULE_ID, 'toggleCalendarDisplay', {
      name: 'Show Calendar',
      hint: 'Display calendar information in the time bar.',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: visible => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setToggleCalendarDisplay(visible);
        }
      }
    });

    game.settings.register(MODULE_ID, 'toggleSecondsDisplay', {
      name: 'Show Seconds',
      hint: 'Display seconds in the time display.',
      scope: 'client',
      config: true,
      type: Boolean,
      default: false,
      onChange: display => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setToggleSecondsDisplay(display);
        }
      }
    });

    game.settings.register(MODULE_ID, 'toggleDialMarker', {
      name: 'Show Time Marker',
      hint: 'Display the current time marker on the dial.',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: visible => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setToggleDialMarker(visible);
        }
      }
    });

    game.settings.register(MODULE_ID, 'toggleWeatherDisplay', {
      name: 'Show Weather',
      hint: 'Display weather information on the dial.',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: visible => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setToggleWeatherDisplay(visible);
        }
      }
    });

    // --- World Settings (shared across all clients) ---
    game.settings.register(MODULE_ID, 'currentWeather', {
      name: 'Current Weather',
      hint: 'The current weather condition for the world.',
      scope: 'world',
      config: false, // Hidden from config menu
      type: String,
      default: 'CLEAR',
      onChange: weather => {
        // Update all clients when weather changes
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api._currentWeather = weather;
          game.modules.get(MODULE_ID).api.updateWeatherDisplay(weather);
          game.modules.get(MODULE_ID).api._ensureWeatherTextOnTop();
          console.log(`${MODULE_ID} | Weather setting changed to: ${weather}`);
        }
      }
    });

    // --- Size and Position Settings ---
    game.settings.register(MODULE_ID, 'globalUiSize', {
      name: 'Global UI Size',
      hint: 'Adjust overall size of the HUD.',
      scope: 'client',
      config: true,
      type: Number,
      default: 1.0,
      range: { min: 0.2, max: 3.0, step: 0.05 },
      onChange: scale => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setGlobalUiSize(scale);
        }
      }
    });

    game.settings.register(MODULE_ID, 'hudTopPadding', {
      name: 'HUD Top Padding',
      hint: 'CSS top value for HUD position (e.g., "10px", "1rem").',
      scope: 'client',
      config: true,
      type: String,
      default: '0px',
      onChange: padding => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setHudTopPadding(padding);
        }
      }
    });

    // --- Font Settings ---
    game.settings.register(MODULE_ID, 'globalFontFamily', {
      name: 'Font Family',
      hint: 'Font family for all text elements.',
      scope: 'client',
      config: true,
      type: String,
      default: 'Signika',
      choices: FontConfig.getAvailableFontChoices(),
      onChange: fontFamily => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setGlobalFontFamily(fontFamily);
        }
      }
    });

    game.settings.register(MODULE_ID, 'globalFontOpacity', {
      name: 'Font Opacity',
      hint: 'Opacity of all text elements.',
      scope: 'client',
      config: true,
      type: Number,
      default: 1.0,
      range: { min: 0.1, max: 1.0, step: 0.05 },
      onChange: opacity => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setGlobalFontOpacity(opacity);
        }
      }
    });

    // --- Visual Settings ---
    game.settings.register(MODULE_ID, 'topBarOpacity', {
      name: 'Top Bar Opacity',
      hint: 'Background opacity of the top time bar.',
      scope: 'client',
      config: true,
      type: Number,
      default: 0.7,
      range: { min: 0.0, max: 1.0, step: 0.05 },
      onChange: alpha => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setTopBarOpacity(alpha);
        }
      }
    });

    game.settings.register(MODULE_ID, 'dialImageOpacity', {
      name: 'Dial Image Opacity',
      hint: 'Opacity of the dial background image.',
      scope: 'client',
      config: true,
      type: Number,
      default: 1.0,
      range: { min: 0.0, max: 1.0, step: 0.05 },
      onChange: alpha => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setDialImageOpacity(alpha);
        }
      }
    });

    game.settings.register(MODULE_ID, 'dialMarkerColor', {
      name: 'Dial Marker Color',
      hint: 'Color of the current time marker.',
      scope: 'client',
      config: true,
      type: String,
      default: '#FFFFFF',
      onChange: color => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setDialMarkerColor(color);
        }
      }
    });

    game.settings.register(MODULE_ID, 'dialMarkerOpacity', {
      name: 'Dial Marker Opacity',
      hint: 'Opacity of the current time marker.',
      scope: 'client',
      config: true,
      type: Number,
      default: 1.0,
      range: { min: 0.0, max: 1.0, step: 0.05 },
      onChange: alpha => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setDialMarkerOpacity(alpha);
        }
      }
    });

    game.settings.register(MODULE_ID, 'customDialImage', {
      name: 'Custom Dial Image',
      hint: 'Choose a custom image for the dial.',
      scope: 'world',
      config: false, // We'll handle this with a custom interface
      type: String,
      default: '',
      onChange: imagePath => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setCustomDialImage(imagePath);
        }
      }
    });

    game.settings.registerMenu(MODULE_ID, 'customDialImageMenu', {
      name: 'Custom Dial Image',
      hint: 'Choose a custom image for the dial.',
      icon: 'fas fa-image',
      type: class extends FormApplication {
        static get defaultOptions() {
          return mergeObject(super.defaultOptions, {
            id: 'soluna-dial-image-config',
            title: 'Custom Dial Image',
            template: 'templates/generic/file-picker.html',
            width: 400,
            height: 200,
            closeOnSubmit: true
          });
        }

        getData() {
          return {
            current: game.settings.get(MODULE_ID, 'customDialImage') || 'modules/soluna-dial/assets/dial.png'
          };
        }

        render(force, options) {
          const html = $(`
            <form>
              <div class="form-group">
                <label>Current Image Path:</label>
                <input type="text" name="imagePath" value="${this.getData().current}" readonly style="width: 100%; margin-bottom: 10px;">
              </div>
              <div class="form-group">
                <button type="button" id="browse-image" style="width: 100%;">
                  <i class="fas fa-folder-open"></i> Browse for Image
                </button>
              </div>
              <div class="form-group">
                <button type="button" id="clear-image" style="width: 100%;">
                  <i class="fas fa-trash"></i> Use Default Image
                </button>
              </div>
            </form>
          `);

          new Dialog({
            title: this.options.title,
            content: html.prop('outerHTML'),
            buttons: {
              close: {
                label: 'Close'
              }
            },
            render: (dialogHtml) => {
              dialogHtml.find('#browse-image').click(async () => {
                const fp = new FilePicker({
                  type: 'image',
                  current: game.settings.get(MODULE_ID, 'customDialImage') || 'modules/soluna-dial/assets/dial.png',
                  callback: (path) => {
                    game.settings.set(MODULE_ID, 'customDialImage', path);
                    dialogHtml.find('input[name="imagePath"]').val(path);
                    ui.notifications.info(`Dial image set to: ${path}`);
                  }
                });
                fp.browse();
              });

              dialogHtml.find('#clear-image').click(() => {
                game.settings.set(MODULE_ID, 'customDialImage', '');
                dialogHtml.find('input[name="imagePath"]').val('modules/soluna-dial/assets/dial.png');
                ui.notifications.info('Dial image reset to default');
              });
            }
          }).render(true);
        }

        _updateObject(event, formData) {
          // Not needed since we handle updates in the button callbacks
        }
      },
      restricted: true
    });

    game.settings.register(MODULE_ID, 'customDialImageScale', {
      name: 'Custom Dial Image Scale',
      hint: 'Scale factor for the custom dial image.',
      scope: 'world',
      config: true,
      type: Number,
      default: 1.0,
      range: { min: 0.1, max: 5.0, step: 0.1 },
      onChange: scale => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setCustomDialImageScale(scale);
        }
      }
    });

    game.settings.register(MODULE_ID, 'customDialImageAngleOffset', {
      name: 'Custom Dial Image Angle Offset',
      hint: 'Angle offset for the custom dial image in degrees. Adjust if your image starts at a different position (0-360 degrees).',
      scope: 'world',
      config: true,
      type: Number,
      default: 90,
      range: { min: 0, max: 360, step: 1 },
      onChange: angle => {
        if (game.modules.get(MODULE_ID)?.api) {
          game.modules.get(MODULE_ID).api.setCustomDialImageAngleOffset(angle);
        }
      }
    });

    console.log(`${MODULE_ID} | Settings registered.`);
  }
} 
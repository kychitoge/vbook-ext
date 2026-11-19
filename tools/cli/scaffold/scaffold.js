'use strict';

const { EXTENSION_TYPES, EXTENSION_LOCALES } = require('../shared/constants');
const { askIfMissing } = require('./prompts');
const { scaffoldExtension } = require('./create');
const { updateExistingExtension } = require('./edit');

module.exports = {
  scaffoldExtension,
  updateExistingExtension,
  askIfMissing,
  ALLOWED_TYPES: EXTENSION_TYPES,
  ALLOWED_LOCALES: EXTENSION_LOCALES
};

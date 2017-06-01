(/** @lends <global> */
	function(window, document, undefined) {( function(factory) {"use strict";

				// Define as an AMD module if possible
				if ( typeof define === 'function' && define.amd) {
					define(['jquery'], factory);
				}
				/* Define using browser globals otherwise
				 * Prevent multiple instantiations if the script is loaded twice
				 */
				else if (jQuery && !jQuery.fn.dataTable) {
					factory(jQuery);
				}
			}(/** @lends <global> */
			function($) {"use strict";
				
				var DataTable = function(oInit) {

					function _fnAddColumn(oSettings, nTh) {
						var oDefaults = DataTable.defaults.columns;
						var iCol = oSettings.aoColumns.length;
						var oCol = $.extend({}, DataTable.models.oColumn, oDefaults, {
							"sSortingClass" : oSettings.oClasses.sSortable,
							"sSortingClassJUI" : oSettings.oClasses.sSortJUI,
							"nTh" : nTh ? nTh : document.createElement('th'),
							"sTitle" : oDefaults.sTitle ? oDefaults.sTitle : nTh ? nTh.innerHTML : '',
							"aDataSort" : oDefaults.aDataSort ? oDefaults.aDataSort : [iCol],
							"mData" : oDefaults.mData ? oDefaults.oDefaults : iCol
						});
						oSettings.aoColumns.push(oCol);

						/* Add a column specific filter */
						if (oSettings.aoPreSearchCols[iCol] === undefined || oSettings.aoPreSearchCols[iCol] === null) {
							oSettings.aoPreSearchCols[iCol] = $.extend({}, DataTable.models.oSearch);
						} else {
							var oPre = oSettings.aoPreSearchCols[iCol];

							/* Don't require that the user must specify bRegex, bSmart or bCaseInsensitive */
							if (oPre.bRegex === undefined) {
								oPre.bRegex = true;
							}

							if (oPre.bSmart === undefined) {
								oPre.bSmart = true;
							}

							if (oPre.bCaseInsensitive === undefined) {
								oPre.bCaseInsensitive = true;
							}
						}

						/* Use the column options function to initialise classes etc */
						_fnColumnOptions(oSettings, iCol, null);
					}

					function _fnColumnOptions(oSettings, iCol, oOptions) {
						var oCol = oSettings.aoColumns[iCol];

						/* User specified column options */
						if (oOptions !== undefined && oOptions !== null) {
							/* Backwards compatibility for mDataProp */
							if (oOptions.mDataProp && !oOptions.mData) {
								oOptions.mData = oOptions.mDataProp;
							}

							if (oOptions.sType !== undefined) {
								oCol.sType = oOptions.sType;
								oCol._bAutoType = false;
							}

							$.extend(oCol, oOptions);
							_fnMap(oCol, oOptions, "sWidth", "sWidthOrig");

							/* iDataSort to be applied (backwards compatibility), but aDataSort will take
							 * priority if defined
							 */
							if (oOptions.iDataSort !== undefined) {
								oCol.aDataSort = [oOptions.iDataSort];
							}
							_fnMap(oCol, oOptions, "aDataSort");
						}

						/* Cache the data get and set functions for speed */
						var mRender = oCol.mRender ? _fnGetObjectDataFn(oCol.mRender) : null;
						var mData = _fnGetObjectDataFn(oCol.mData);

						oCol.fnGetData = function(oData, sSpecific) {
							var innerData = mData(oData, sSpecific);

							if (oCol.mRender && (sSpecific && sSpecific !== '')) {
								return mRender(innerData, sSpecific, oData);
							}
							return innerData;
						};
						oCol.fnSetData = _fnSetObjectDataFn(oCol.mData);

						/* Feature sorting overrides column specific when off */
						if (!oSettings.oFeatures.bSort) {
							oCol.bSortable = false;
						}

						/* Check that the class assignment is correct for sorting */
						if (!oCol.bSortable || ($.inArray('asc', oCol.asSorting) == -1 && $.inArray('desc', oCol.asSorting) == -1)) {
							oCol.sSortingClass = oSettings.oClasses.sSortableNone;
							oCol.sSortingClassJUI = "";
						} else if ($.inArray('asc', oCol.asSorting) == -1 && $.inArray('desc', oCol.asSorting) == -1) {
							oCol.sSortingClass = oSettings.oClasses.sSortable;
							oCol.sSortingClassJUI = oSettings.oClasses.sSortJUI;
						} else if ($.inArray('asc', oCol.asSorting) != -1 && $.inArray('desc', oCol.asSorting) == -1) {
							oCol.sSortingClass = oSettings.oClasses.sSortableAsc;
							oCol.sSortingClassJUI = oSettings.oClasses.sSortJUIAscAllowed;
						} else if ($.inArray('asc', oCol.asSorting) == -1 && $.inArray('desc', oCol.asSorting) != -1) {
							oCol.sSortingClass = oSettings.oClasses.sSortableDesc;
							oCol.sSortingClassJUI = oSettings.oClasses.sSortJUIDescAllowed;
						}
					}

					function _fnAdjustColumnSizing(oSettings) {
						/* Not interested in doing column width calculation if auto-width is disabled */
						if (oSettings.oFeatures.bAutoWidth === false) {
							return false;
						}

						_fnCalculateColumnWidths(oSettings);
						for (var i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
							oSettings.aoColumns[i].nTh.style.width = oSettings.aoColumns[i].sWidth;
						}
					}

					function _fnVisibleToColumnIndex(oSettings, iMatch) {
						var aiVis = _fnGetColumns(oSettings, 'bVisible');

						return typeof aiVis[iMatch] === 'number' ? aiVis[iMatch] : null;
					}

					function _fnColumnIndexToVisible(oSettings, iMatch) {
						var aiVis = _fnGetColumns(oSettings, 'bVisible');
						var iPos = $.inArray(iMatch, aiVis);

						return iPos !== -1 ? iPos : null;
					}

					function _fnVisbleColumns(oSettings) {
						return _fnGetColumns(oSettings, 'bVisible').length;
					}

					function _fnGetColumns(oSettings, sParam) {
						var a = [];

						$.map(oSettings.aoColumns, function(val, i) {
							if (val[sParam]) {
								a.push(i);
							}
						});

						return a;
					}

					function _fnDetectType(sData) {
						var aTypes = DataTable.ext.aTypes;
						var iLen = aTypes.length;

						for (var i = 0; i < iLen; i++) {
							var sType = aTypes[i](sData);
							if (sType !== null) {
								return sType;
							}
						}

						return 'string';
					}

					function _fnReOrderIndex(oSettings, sColumns) {
						var aColumns = sColumns.split(',');
						var aiReturn = [];

						for (var i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
							for (var j = 0; j < iLen; j++) {
								if (oSettings.aoColumns[i].sName == aColumns[j]) {
									aiReturn.push(j);
									break;
								}
							}
						}

						return aiReturn;
					}

					function _fnColumnOrdering(oSettings) {
						var sNames = '';
						for (var i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
							sNames += oSettings.aoColumns[i].sName + ',';
						}
						if (sNames.length == iLen) {
							return "";
						}
						return sNames.slice(0, -1);
					}

					function _fnApplyColumnDefs(oSettings, aoColDefs, aoCols, fn) {
						var i, iLen, j, jLen, k, kLen;

						// Column definitions with aTargets
						if (aoColDefs) {
							/* Loop over the definitions array - loop in reverse so first instance has priority */
							for ( i = aoColDefs.length - 1; i >= 0; i--) {
								/* Each definition can target multiple columns, as it is an array */
								var aTargets = aoColDefs[i].aTargets;
								if (!$.isArray(aTargets)) {
									_fnLog(oSettings, 1, 'aTargets must be an array of targets, not a ' + ( typeof aTargets));
								}

								for ( j = 0, jLen = aTargets.length; j < jLen; j++) {
									if ( typeof aTargets[j] === 'number' && aTargets[j] >= 0) {
										/* Add columns that we don't yet know about */
										while (oSettings.aoColumns.length <= aTargets[j]) {
											_fnAddColumn(oSettings);
										}

										/* Integer, basic index */
										fn(aTargets[j], aoColDefs[i]);
									} else if ( typeof aTargets[j] === 'number' && aTargets[j] < 0) {
										/* Negative integer, right to left column counting */
										fn(oSettings.aoColumns.length + aTargets[j], aoColDefs[i]);
									} else if ( typeof aTargets[j] === 'string') {
										/* Class name matching on TH element */
										for ( k = 0, kLen = oSettings.aoColumns.length; k < kLen; k++) {
											if (aTargets[j] == "_all" || $(oSettings.aoColumns[k].nTh).hasClass(aTargets[j])) {
												fn(k, aoColDefs[i]);
											}
										}
									}
								}
							}
						}

						// Statically defined columns array
						if (aoCols) {
							for ( i = 0, iLen = aoCols.length; i < iLen; i++) {
								fn(i, aoCols[i]);
							}
						}
					}

					function _fnAddData(oSettings, aDataSupplied) {
						var oCol;

						/* Take an independent copy of the data source so we can bash it about as we wish */
						var aDataIn = ($.isArray(aDataSupplied)) ? aDataSupplied.slice() : $.extend(true, {}, aDataSupplied);

						/* Create the object for storing information about this new row */
						var iRow = oSettings.aoData.length;
						var oData = $.extend(true, {}, DataTable.models.oRow);
						oData._aData = aDataIn;
						oSettings.aoData.push(oData);

						/* Create the cells */
						var nTd, sThisType;
						for (var i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
							oCol = oSettings.aoColumns[i];

							/* Use rendered data for filtering / sorting */
							if ( typeof oCol.fnRender === 'function' && oCol.bUseRendered && oCol.mData !== null) {
								_fnSetCellData(oSettings, iRow, i, _fnRender(oSettings, iRow, i));
							} else {
								_fnSetCellData(oSettings, iRow, i, _fnGetCellData(oSettings, iRow, i));
							}

							/* See if we should auto-detect the column type */
							if (oCol._bAutoType && oCol.sType != 'string') {
								/* Attempt to auto detect the type - same as _fnGatherData() */
								var sVarType = _fnGetCellData(oSettings, iRow, i, 'type');
								if (sVarType !== null && sVarType !== '') {
									sThisType = _fnDetectType(sVarType);
									if (oCol.sType === null) {
										oCol.sType = sThisType;
									} else if (oCol.sType != sThisType && oCol.sType != "html") {
										/* String is always the 'fallback' option */
										oCol.sType = 'string';
									}
								}
							}
						}

						/* Add to the display array */
						oSettings.aiDisplayMaster.push(iRow);

						/* Create the DOM information */
						if (!oSettings.oFeatures.bDeferRender) {
							_fnCreateTr(oSettings, iRow);
						}

						return iRow;
					}

					function _fnGatherData(oSettings) {
						var iLoop, i, iLen, j, jLen, jInner, nTds, nTrs, nTd, nTr, aLocalData, iThisIndex, iRow, iRows, iColumn, iColumns, sNodeName, oCol, oData;

						if (oSettings.bDeferLoading || oSettings.sAjaxSource === null) {
							nTr = oSettings.nTBody.firstChild;
							while (nTr) {
								if (nTr.nodeName.toUpperCase() == "TR") {
									iThisIndex = oSettings.aoData.length;
									nTr._DT_RowIndex = iThisIndex;
									oSettings.aoData.push($.extend(true, {}, DataTable.models.oRow, {
										"nTr" : nTr
									}));

									oSettings.aiDisplayMaster.push(iThisIndex);
									nTd = nTr.firstChild;
									jInner = 0;
									while (nTd) {
										sNodeName = nTd.nodeName.toUpperCase();
										if (sNodeName == "TD" || sNodeName == "TH") {
											_fnSetCellData(oSettings, iThisIndex, jInner, $.trim(nTd.innerHTML));
											jInner++;
										}
										nTd = nTd.nextSibling;
									}
								}
								nTr = nTr.nextSibling;
							}
						}

						nTrs = _fnGetTrNodes(oSettings);
						nTds = [];
						for ( i = 0, iLen = nTrs.length; i < iLen; i++) {
							nTd = nTrs[i].firstChild;
							while (nTd) {
								sNodeName = nTd.nodeName.toUpperCase();
								if (sNodeName == "TD" || sNodeName == "TH") {
									nTds.push(nTd);
								}
								nTd = nTd.nextSibling;
							}
						}

						/* Now process by column */
						for ( iColumn = 0, iColumns = oSettings.aoColumns.length; iColumn < iColumns; iColumn++) {
							oCol = oSettings.aoColumns[iColumn];

							/* Get the title of the column - unless there is a user set one */
							if (oCol.sTitle === null) {
								oCol.sTitle = oCol.nTh.innerHTML;
							}

							var bAutoType = oCol._bAutoType, bRender = typeof oCol.fnRender === 'function', bClass = oCol.sClass !== null, bVisible = oCol.bVisible, nCell, sThisType, sRendered, sValType;

							/* A single loop to rule them all (and be more efficient) */
							if (bAutoType || bRender || bClass || !bVisible) {
								for ( iRow = 0, iRows = oSettings.aoData.length; iRow < iRows; iRow++) {
									oData = oSettings.aoData[iRow];
									nCell = nTds[(iRow * iColumns) + iColumn];

									/* Type detection */
									if (bAutoType && oCol.sType != 'string') {
										sValType = _fnGetCellData(oSettings, iRow, iColumn, 'type');
										if (sValType !== '') {
											sThisType = _fnDetectType(sValType);
											if (oCol.sType === null) {
												oCol.sType = sThisType;
											} else if (oCol.sType != sThisType && oCol.sType != "html") {
												/* String is always the 'fallback' option */
												oCol.sType = 'string';
											}
										}
									}

									if (oCol.mRender) {
										// mRender has been defined, so we need to get the value and set it
										nCell.innerHTML = _fnGetCellData(oSettings, iRow, iColumn, 'display');
									} else if (oCol.mData !== iColumn) {
										// If mData is not the same as the column number, then we need to
										// get the dev set value. If it is the column, no point in wasting
										// time setting the value that is already there!
										nCell.innerHTML = _fnGetCellData(oSettings, iRow, iColumn, 'display');
									}

									/* Rendering */
									if (bRender) {
										sRendered = _fnRender(oSettings, iRow, iColumn);
										nCell.innerHTML = sRendered;
										if (oCol.bUseRendered) {
											/* Use the rendered data for filtering / sorting */
											_fnSetCellData(oSettings, iRow, iColumn, sRendered);
										}
									}

									/* Classes */
									if (bClass) {
										nCell.className += ' ' + oCol.sClass;
									}

									/* Column visibility */
									if (!bVisible) {
										oData._anHidden[iColumn] = nCell;
										nCell.parentNode.removeChild(nCell);
									} else {
										oData._anHidden[iColumn] = null;
									}

									if (oCol.fnCreatedCell) {
										oCol.fnCreatedCell.call(oSettings.oInstance, nCell, _fnGetCellData(oSettings, iRow, iColumn, 'display'), oData._aData, iRow, iColumn);
									}
								}
							}
						}

						/* Row created callbacks */
						if (oSettings.aoRowCreatedCallback.length !== 0) {
							for ( i = 0, iLen = oSettings.aoData.length; i < iLen; i++) {
								oData = oSettings.aoData[i];
								_fnCallbackFire(oSettings, 'aoRowCreatedCallback', null, [oData.nTr, oData._aData, i]);
							}
						}
					}

					function _fnNodeToDataIndex(oSettings, n) {
						return (n._DT_RowIndex !== undefined) ? n._DT_RowIndex : null;
					}

					function _fnNodeToColumnIndex(oSettings, iRow, n) {
						var anCells = _fnGetTdNodes(oSettings, iRow);

						for (var i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
							if (anCells[i] === n) {
								return i;
							}
						}
						return -1;
					}

					function _fnGetRowData(oSettings, iRow, sSpecific, aiColumns) {
						var out = [];
						for (var i = 0, iLen = aiColumns.length; i < iLen; i++) {
							out.push(_fnGetCellData(oSettings, iRow, aiColumns[i], sSpecific));
						}
						return out;
					}

					function _fnGetCellData(oSettings, iRow, iCol, sSpecific) {
						var sData;
						var oCol = oSettings.aoColumns[iCol];
						var oData = oSettings.aoData[iRow]._aData;

						if (( sData = oCol.fnGetData(oData, sSpecific)) === undefined) {
							if (oSettings.iDrawError != oSettings.iDraw && oCol.sDefaultContent === null) {
								_fnLog(oSettings, 0, "Requested unknown parameter " + ( typeof oCol.mData == 'function' ? '{mData function}' : "'" + oCol.mData + "'") + " from the data source for row " + iRow);
								oSettings.iDrawError = oSettings.iDraw;
							}
							return oCol.sDefaultContent;
						}

						/* When the data source is null, we can use default column data */
						if (sData === null && oCol.sDefaultContent !== null) {
							sData = oCol.sDefaultContent;
						} else if ( typeof sData === 'function') {
							/* If the data source is a function, then we run it and use the return */
							return sData();
						}

						if (sSpecific == 'display' && sData === null) {
							return '';
						}
						return sData;
					}

					function _fnSetCellData(oSettings, iRow, iCol, val) {
						var oCol = oSettings.aoColumns[iCol];
						var oData = oSettings.aoData[iRow]._aData;

						oCol.fnSetData(oData, val);
					}

					// Private variable that is used to match array syntax in the data property object
					var __reArray = /\[.*?\]$/;

					function _fnGetObjectDataFn(mSource) {
						if (mSource === null) {
							/* Give an empty string for rendering / sorting etc */
							return function(data, type) {
								return null;
							};
						} else if ( typeof mSource === 'function') {
							return function(data, type, extra) {
								return mSource(data, type, extra);
							};
						} else if ( typeof mSource === 'string' && (mSource.indexOf('.') !== -1 || mSource.indexOf('[') !== -1)) {
							
							var fetchData = function(data, type, src) {
								var a = src.split('.');
								var arrayNotation, out, innerSrc;

								if (src !== "") {
									for (var i = 0, iLen = a.length; i < iLen; i++) {
										// Check if we are dealing with an array notation request
										arrayNotation = a[i].match(__reArray);

										if (arrayNotation) {
											a[i] = a[i].replace(__reArray, '');

											// Condition allows simply [] to be passed in
											if (a[i] !== "") {
												data = data[a[i]];
											}
											out = [];

											// Get the remainder of the nested object to get
											a.splice(0, i + 1);
											innerSrc = a.join('.');

											// Traverse each entry in the array getting the properties requested
											for (var j = 0, jLen = data.length; j < jLen; j++) {
												out.push(fetchData(data[j], type, innerSrc));
											}

											// If a string is given in between the array notation indicators, that
											// is used to join the strings together, otherwise an array is returned
											var join = arrayNotation[0].substring(1, arrayNotation[0].length - 1);
											data = (join === "") ? out : out.join(join);

											// The inner call to fetchData has already traversed through the remainder
											// of the source requested, so we exit from the loop
											break;
										}

										if (data === null || data[a[i]] === undefined) {
											return undefined;
										}
										data = data[a[i]];
									}
								}

								return data;
							};

							return function(data, type) {
								return fetchData(data, type, mSource);
							};
						} else {
							/* Array or flat object mapping */
							return function(data, type) {
								return data[mSource];
							};
						}
					}

					function _fnSetObjectDataFn(mSource) {
						if (mSource === null) {
							/* Nothing to do when the data source is null */
							return function(data, val) {
							};
						} else if ( typeof mSource === 'function') {
							return function(data, val) {
								mSource(data, 'set', val);
							};
						} else if ( typeof mSource === 'string' && (mSource.indexOf('.') !== -1 || mSource.indexOf('[') !== -1)) {
							/* Like the get, we need to get data from a nested object */
							var setData = function(data, val, src) {
								var a = src.split('.'), b;
								var arrayNotation, o, innerSrc;

								for (var i = 0, iLen = a.length - 1; i < iLen; i++) {
									// Check if we are dealing with an array notation request
									arrayNotation = a[i].match(__reArray);

									if (arrayNotation) {
										a[i] = a[i].replace(__reArray, '');
										data[a[i]] = [];

										// Get the remainder of the nested object to set so we can recurse
										b = a.slice();
										b.splice(0, i + 1);
										innerSrc = b.join('.');

										// Traverse each entry in the array setting the properties requested
										for (var j = 0, jLen = val.length; j < jLen; j++) {
											o = {};
											setData(o, val[j], innerSrc);
											data[a[i]].push(o);
										}

										// The inner call to setData has already traversed through the remainder
										// of the source and has set the data, thus we can exit here
										return;
									}

									// If the nested object doesn't currently exist - since we are
									// trying to set the value - create it
									if (data[a[i]] === null || data[a[i]] === undefined) {
										data[a[i]] = {};
									}
									data = data[a[i]];
								}

								// If array notation is used, we just want to strip it and use the property name
								// and assign the value. If it isn't used, then we get the result we want anyway
								data[ a[a.length - 1].replace(__reArray, '')] = val;
							};

							return function(data, val) {
								return setData(data, val, mSource);
							};
						} else {
							/* Array or flat object mapping */
							return function(data, val) {
								data[mSource] = val;
							};
						}
					}

					function _fnGetDataMaster(oSettings) {
						var aData = [];
						var iLen = oSettings.aoData.length;
						for (var i = 0; i < iLen; i++) {
							aData.push(oSettings.aoData[i]._aData);
						}
						return aData;
					}

					function _fnClearTable(oSettings) {
						oSettings.aoData.splice(0, oSettings.aoData.length);
						oSettings.aiDisplayMaster.splice(0, oSettings.aiDisplayMaster.length);
						oSettings.aiDisplay.splice(0, oSettings.aiDisplay.length);
						_fnCalculateEnd(oSettings);
					}

					function _fnDeleteIndex(a, iTarget) {
						var iTargetIndex = -1;

						for (var i = 0, iLen = a.length; i < iLen; i++) {
							if (a[i] == iTarget) {
								iTargetIndex = i;
							} else if (a[i] > iTarget) {
								a[i]--;
							}
						}

						if (iTargetIndex != -1) {
							a.splice(iTargetIndex, 1);
						}
					}

					function _fnRender(oSettings, iRow, iCol) {
						var oCol = oSettings.aoColumns[iCol];

						return oCol.fnRender({
							"iDataRow" : iRow,
							"iDataColumn" : iCol,
							"oSettings" : oSettings,
							"aData" : oSettings.aoData[iRow]._aData,
							"mDataProp" : oCol.mData
						}, _fnGetCellData(oSettings, iRow, iCol, 'display'));
					}

					function _fnCreateTr(oSettings, iRow) {
						var oData = oSettings.aoData[iRow];
						var nTd;

						if (oData.nTr === null) {
							oData.nTr = document.createElement('tr');

							/* Use a private property on the node to allow reserve mapping from the node
							 * to the aoData array for fast look up
							 */
							oData.nTr._DT_RowIndex = iRow;

							/* Special parameters can be given by the data source to be used on the row */
							if (oData._aData.DT_RowId) {
								oData.nTr.id = oData._aData.DT_RowId;
							}

							if (oData._aData.DT_RowClass) {
								oData.nTr.className = oData._aData.DT_RowClass;
							}

							/* Process each column */
							for (var i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
								var oCol = oSettings.aoColumns[i];
								nTd = document.createElement(oCol.sCellType);

								/* Render if needed - if bUseRendered is true then we already have the rendered
								 * value in the data source - so can just use that
								 */
								nTd.innerHTML = ( typeof oCol.fnRender === 'function' && (!oCol.bUseRendered || oCol.mData === null)) ? _fnRender(oSettings, iRow, i) : _fnGetCellData(oSettings, iRow, i, 'display');

								/* Add user defined class */
								if (oCol.sClass !== null) {
									nTd.className = oCol.sClass;
								}

								if (oCol.bVisible) {
									oData.nTr.appendChild(nTd);
									oData._anHidden[i] = null;
								} else {
									oData._anHidden[i] = nTd;
								}

								if (oCol.fnCreatedCell) {
									oCol.fnCreatedCell.call(oSettings.oInstance, nTd, _fnGetCellData(oSettings, iRow, i, 'display'), oData._aData, iRow, i);
								}
							}

							_fnCallbackFire(oSettings, 'aoRowCreatedCallback', null, [oData.nTr, oData._aData, iRow]);
						}
					}

					function _fnBuildHead(oSettings) {
						var i, nTh, iLen, j, jLen;
						var iThs = $('th, td', oSettings.nTHead).length;
						var iCorrector = 0;
						var jqChildren;

						/* If there is a header in place - then use it - otherwise it's going to get nuked... */
						if (iThs !== 0) {
							/* We've got a thead from the DOM, so remove hidden columns and apply width to vis cols */
							for ( i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
								nTh = oSettings.aoColumns[i].nTh;
								nTh.setAttribute('role', 'columnheader');
								if (oSettings.aoColumns[i].bSortable) {
									nTh.setAttribute('tabindex', oSettings.iTabIndex);
									nTh.setAttribute('aria-controls', oSettings.sTableId);
								}

								if (oSettings.aoColumns[i].sClass !== null) {
									$(nTh).addClass(oSettings.aoColumns[i].sClass);
								}

								/* Set the title of the column if it is user defined (not what was auto detected) */
								if (oSettings.aoColumns[i].sTitle != nTh.innerHTML) {
									nTh.innerHTML = oSettings.aoColumns[i].sTitle;
								}
							}
						} else {
							/* We don't have a header in the DOM - so we are going to have to create one */
							var nTr = document.createElement("tr");

							for ( i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
								nTh = oSettings.aoColumns[i].nTh;
								nTh.innerHTML = oSettings.aoColumns[i].sTitle;
								nTh.setAttribute('tabindex', '0');

								if (oSettings.aoColumns[i].sClass !== null) {
									$(nTh).addClass(oSettings.aoColumns[i].sClass);
								}

								nTr.appendChild(nTh);
							}
							$(oSettings.nTHead).html( '' )[0].appendChild(nTr);
							_fnDetectHeader(oSettings.aoHeader, oSettings.nTHead);
						}

						/* ARIA role for the rows */
						$(oSettings.nTHead).children('tr').attr('role', 'row');

						/* Add the extra markup needed by jQuery UI's themes */
						if (oSettings.bJUI) {
							for ( i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
								nTh = oSettings.aoColumns[i].nTh;

								var nDiv = document.createElement('div');
								nDiv.className = oSettings.oClasses.sSortJUIWrapper;
								$(nTh).contents().appendTo(nDiv);

								var nSpan = document.createElement('span');
								nSpan.className = oSettings.oClasses.sSortIcon;
								nDiv.appendChild(nSpan);
								nTh.appendChild(nDiv);
							}
						}

						if (oSettings.oFeatures.bSort) {
							for ( i = 0; i < oSettings.aoColumns.length; i++) {
								if (oSettings.aoColumns[i].bSortable !== false) {
									_fnSortAttachListener(oSettings, oSettings.aoColumns[i].nTh, i);
								} else {
									$(oSettings.aoColumns[i].nTh).addClass(oSettings.oClasses.sSortableNone);
								}
							}
						}

						/* Deal with the footer - add classes if required */
						if (oSettings.oClasses.sFooterTH !== "") {
							$(oSettings.nTFoot).children('tr').children('th').addClass(oSettings.oClasses.sFooterTH);
						}

						/* Cache the footer elements */
						if (oSettings.nTFoot !== null) {
							var anCells = _fnGetUniqueThs(oSettings, null, oSettings.aoFooter);
							for ( i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
								if (anCells[i]) {
									oSettings.aoColumns[i].nTf = anCells[i];
									if (oSettings.aoColumns[i].sClass) {
										$(anCells[i]).addClass(oSettings.aoColumns[i].sClass);
									}
								}
							}
						}
					}

					function _fnDrawHead(oSettings, aoSource, bIncludeHidden) {
						var i, iLen, j, jLen, k, kLen, n, nLocalTr;
						var aoLocal = [];
						var aApplied = [];
						var iColumns = oSettings.aoColumns.length;
						var iRowspan, iColspan;

						if (bIncludeHidden === undefined) {
							bIncludeHidden = false;
						}

						/* Make a copy of the master layout array, but without the visible columns in it */
						for ( i = 0, iLen = aoSource.length; i < iLen; i++) {
							aoLocal[i] = aoSource[i].slice();
							aoLocal[i].nTr = aoSource[i].nTr;

							/* Remove any columns which are currently hidden */
							for ( j = iColumns - 1; j >= 0; j--) {
								if (!oSettings.aoColumns[j].bVisible && !bIncludeHidden) {
									aoLocal[i].splice(j, 1);
								}
							}

							/* Prep the applied array - it needs an element for each row */
							aApplied.push([]);
						}

						for ( i = 0, iLen = aoLocal.length; i < iLen; i++) {
							nLocalTr = aoLocal[i].nTr;

							/* All cells are going to be replaced, so empty out the row */
							if (nLocalTr) {
								while (( n = nLocalTr.firstChild)) {
									nLocalTr.removeChild(n);
								}
							}

							for ( j = 0, jLen = aoLocal[i].length; j < jLen; j++) {
								iRowspan = 1;
								iColspan = 1;

								/* Check to see if there is already a cell (row/colspan) covering our target
								 * insert point. If there is, then there is nothing to do.
								 */
								if (aApplied[i][j] === undefined) {
									nLocalTr.appendChild(aoLocal[i][j].cell);
									aApplied[i][j] = 1;

									/* Expand the cell to cover as many rows as needed */
									while (aoLocal[i + iRowspan] !== undefined && aoLocal[i][j].cell == aoLocal[i+iRowspan][j].cell) {
										aApplied[i+iRowspan][j] = 1;
										iRowspan++;
									}

									/* Expand the cell to cover as many columns as needed */
									while (aoLocal[i][j + iColspan] !== undefined && aoLocal[i][j].cell == aoLocal[i][j + iColspan].cell) {
										/* Must update the applied array over the rows for the columns */
										for ( k = 0; k < iRowspan; k++) {
											aApplied[i+k][j + iColspan] = 1;
										}
										iColspan++;
									}

									/* Do the actual expansion in the DOM */
									aoLocal[i][j].cell.rowSpan = iRowspan;
									aoLocal[i][j].cell.colSpan = iColspan;
								}
							}
						}
					}

					function _fnDraw(oSettings) {
						/* Provide a pre-callback function which can be used to cancel the draw is false is returned */
						var aPreDraw = _fnCallbackFire(oSettings, 'aoPreDrawCallback', 'preDraw', [oSettings]);
						if ($.inArray(false, aPreDraw) !== -1) {
							_fnProcessingDisplay(oSettings, false);
							return;
						}

						var i, iLen, n;
						var anRows = [];
						var iRowCount = 0;
						var iStripes = oSettings.asStripeClasses.length;
						var iOpenRows = oSettings.aoOpenRows.length;

						oSettings.bDrawing = true;

						/* Check and see if we have an initial draw position from state saving */
						if (oSettings.iInitDisplayStart !== undefined && oSettings.iInitDisplayStart != -1) {
							if (oSettings.oFeatures.bServerSide) {
								oSettings._iDisplayStart = oSettings.iInitDisplayStart;
							} else {
								oSettings._iDisplayStart = (oSettings.iInitDisplayStart >= oSettings.fnRecordsDisplay()) ? 0 : oSettings.iInitDisplayStart;
							}
							oSettings.iInitDisplayStart = -1;
							_fnCalculateEnd(oSettings);
						}

						/* Server-side processing draw intercept */
						if (oSettings.bDeferLoading) {
							oSettings.bDeferLoading = false;
							oSettings.iDraw++;
						} else if (!oSettings.oFeatures.bServerSide) {
							oSettings.iDraw++;
						} else if (!oSettings.bDestroying && !_fnAjaxUpdate(oSettings)) {
							return;
						}

						if (oSettings.aiDisplay.length !== 0) {
							var iStart = oSettings._iDisplayStart;
							var iEnd = oSettings._iDisplayEnd;

							if (oSettings.oFeatures.bServerSide) {
								iStart = 0;
								iEnd = oSettings.aoData.length;
							}

							for (var j = iStart; j < iEnd; j++) {
								var aoData = oSettings.aoData[oSettings.aiDisplay[j]];
								if (aoData.nTr === null) {
									_fnCreateTr(oSettings, oSettings.aiDisplay[j]);
								}

								var nRow = aoData.nTr;

								/* Remove the old striping classes and then add the new one */
								if (iStripes !== 0) {
									var sStripe = oSettings.asStripeClasses[iRowCount % iStripes];
									if (aoData._sRowStripe != sStripe) {
										$(nRow).removeClass(aoData._sRowStripe).addClass(sStripe);
										aoData._sRowStripe = sStripe;
									}
								}

								/* Row callback functions - might want to manipulate the row */
								_fnCallbackFire(oSettings, 'aoRowCallback', null, [nRow, oSettings.aoData[oSettings.aiDisplay[j]]._aData, iRowCount, j]);

								anRows.push(nRow);
								iRowCount++;

								/* If there is an open row - and it is attached to this parent - attach it on redraw */
								if (iOpenRows !== 0) {
									for (var k = 0; k < iOpenRows; k++) {
										if (nRow == oSettings.aoOpenRows[k].nParent) {
											anRows.push(oSettings.aoOpenRows[k].nTr);
											break;
										}
									}
								}
							}
						} else {
							/* Table is empty - create a row with an empty message in it */
							anRows[0] = document.createElement('tr');

							if (oSettings.asStripeClasses[0]) {
								anRows[0].className = oSettings.asStripeClasses[0];
							}

							var oLang = oSettings.oLanguage;
							var sZero = oLang.sZeroRecords;
							if (oSettings.iDraw == 1 && oSettings.sAjaxSource !== null && !oSettings.oFeatures.bServerSide) {
								sZero = oLang.sLoadingRecords;
							} else if (oLang.sEmptyTable && oSettings.fnRecordsTotal() === 0) {
								sZero = oLang.sEmptyTable;
							}

							var nTd = document.createElement('td');
							nTd.setAttribute('valign', "top");
							nTd.colSpan = _fnVisbleColumns(oSettings);
							nTd.className = oSettings.oClasses.sRowEmpty;
							nTd.innerHTML = _fnInfoMacros(oSettings, sZero);

							anRows[iRowCount].appendChild(nTd);
						}

						/* Header and footer callbacks */
						_fnCallbackFire(oSettings, 'aoHeaderCallback', 'header', [$(oSettings.nTHead).children('tr')[0], _fnGetDataMaster(oSettings), oSettings._iDisplayStart, oSettings.fnDisplayEnd(), oSettings.aiDisplay]);

						_fnCallbackFire(oSettings, 'aoFooterCallback', 'footer', [$(oSettings.nTFoot).children('tr')[0], _fnGetDataMaster(oSettings), oSettings._iDisplayStart, oSettings.fnDisplayEnd(), oSettings.aiDisplay]);

						var nAddFrag = document.createDocumentFragment(), nRemoveFrag = document.createDocumentFragment(), nBodyPar, nTrs;

						if (oSettings.nTBody) {
							nBodyPar = oSettings.nTBody.parentNode;
							nRemoveFrag.appendChild(oSettings.nTBody);

							if (!oSettings.oScroll.bInfinite || !oSettings._bInitComplete || oSettings.bSorted || oSettings.bFiltered) {
								while (( n = oSettings.nTBody.firstChild)) {
									oSettings.nTBody.removeChild(n);
								}
							}

							/* Put the draw table into the dom */
							for ( i = 0, iLen = anRows.length; i < iLen; i++) {
								nAddFrag.appendChild(anRows[i]);
							}

							oSettings.nTBody.appendChild(nAddFrag);
							if (nBodyPar !== null) {
								nBodyPar.appendChild(oSettings.nTBody);
							}
						}

						/* Call all required callback functions for the end of a draw */
						_fnCallbackFire(oSettings, 'aoDrawCallback', 'draw', [oSettings]);

						/* Draw is complete, sorting and filtering must be as well */
						oSettings.bSorted = false;
						oSettings.bFiltered = false;
						oSettings.bDrawing = false;

						if (oSettings.oFeatures.bServerSide) {
							_fnProcessingDisplay(oSettings, false);
							if (!oSettings._bInitComplete) {
								_fnInitComplete(oSettings);
							}
						}
					}

					function _fnReDraw(oSettings) {
						if (oSettings.oFeatures.bSort) {
							/* Sorting will refilter and draw for us */
							_fnSort(oSettings, oSettings.oPreviousSearch);
						} else if (oSettings.oFeatures.bFilter) {
							/* Filtering will redraw for us */
							_fnFilterComplete(oSettings, oSettings.oPreviousSearch);
						} else {
							_fnCalculateEnd(oSettings);
							_fnDraw(oSettings);
						}
					}

					function _fnAddOptionsHtml(oSettings) {
						
						var nHolding = $('<div></div>')[0];
						oSettings.nTable.parentNode.insertBefore(nHolding, oSettings.nTable);

						/*
						 * All DataTables are wrapped in a div
						 */
						oSettings.nTableWrapper = $('<div id="'+oSettings.sTableId+'_wrapper" class="'+oSettings.oClasses.sWrapper+'" role="grid"></div>')[0];
						oSettings.nTableReinsertBefore = oSettings.nTable.nextSibling;

						/* Track where we want to insert the option */
						var nInsertNode = oSettings.nTableWrapper;

						/* Loop over the user set positioning and place the elements as needed */
						var aDom = oSettings.sDom.split('');
						var nTmp, iPushFeature, cOption, nNewNode, cNext, sAttr, j;
						for (var i = 0; i < aDom.length; i++) {
							iPushFeature = 0;
							cOption = aDom[i];

							if (cOption == '<') {
								/* New container div */
								nNewNode = $('<div></div>')[0];

								/* Check to see if we should append an id and/or a class name to the container */
								cNext = aDom[i + 1];
								if (cNext == "'" || cNext == '"') {
									sAttr = "";
									j = 2;
									while (aDom[i + j] != cNext) {
										sAttr += aDom[i + j];
										j++;
									}

									/* Replace jQuery UI constants */
									if (sAttr == "H") {
										sAttr = oSettings.oClasses.sJUIHeader;
									} else if (sAttr == "F") {
										sAttr = oSettings.oClasses.sJUIFooter;
									}

									/* The attribute can be in the format of "#id.class", "#id" or "class" This logic
									 * breaks the string into parts and applies them as needed
									 */
									if (sAttr.indexOf('.') != -1) {
										var aSplit = sAttr.split('.');
										nNewNode.id = aSplit[0].substr(1, aSplit[0].length - 1);
										nNewNode.className = aSplit[1];
									} else if (sAttr.charAt(0) == "#") {
										nNewNode.id = sAttr.substr(1, sAttr.length - 1);
									} else {
										nNewNode.className = sAttr;
									}

									i += j;
									/* Move along the position array */
								}

								nInsertNode.appendChild(nNewNode);
								nInsertNode = nNewNode;
							} else if (cOption == '>') {
								/* End container div */
								nInsertNode = nInsertNode.parentNode;
							} else if (cOption == 'l' && oSettings.oFeatures.bPaginate && oSettings.oFeatures.bLengthChange) {
								/* Length */
								nTmp = _fnFeatureHtmlLength(oSettings);
								iPushFeature = 1;
							} else if (cOption == 'f' && oSettings.oFeatures.bFilter) {
								/* Filter */
								nTmp = _fnFeatureHtmlFilter(oSettings);
								iPushFeature = 1;
							} else if (cOption == 'r' && oSettings.oFeatures.bProcessing) {
								/* pRocessing */
								nTmp = _fnFeatureHtmlProcessing(oSettings);
								iPushFeature = 1;
							} else if (cOption == 't') {
								/* Table */
								nTmp = _fnFeatureHtmlTable(oSettings);
								iPushFeature = 1;
							} else if (cOption == 'i' && oSettings.oFeatures.bInfo) {
								/* Info */
								nTmp = _fnFeatureHtmlInfo(oSettings);
								iPushFeature = 1;
							} else if (cOption == 'p' && oSettings.oFeatures.bPaginate) {
								/* Pagination */
								nTmp = _fnFeatureHtmlPaginate(oSettings);
								iPushFeature = 1;
							} else if (DataTable.ext.aoFeatures.length !== 0) {
								/* Plug-in features */
								var aoFeatures = DataTable.ext.aoFeatures;
								for (var k = 0, kLen = aoFeatures.length; k < kLen; k++) {
									if (cOption == aoFeatures[k].cFeature) {
										nTmp = aoFeatures[k].fnInit(oSettings);
										if (nTmp) {
											iPushFeature = 1;
										}
										break;
									}
								}
							}

							/* Add to the 2D features array */
							if (iPushFeature == 1 && nTmp !== null) {
								if ( typeof oSettings.aanFeatures[cOption] !== 'object') {
									oSettings.aanFeatures[cOption] = [];
								}
								oSettings.aanFeatures[cOption].push(nTmp);
								nInsertNode.appendChild(nTmp);
							}
						}

						/* Built our DOM structure - replace the holding div with what we want */
						nHolding.parentNode.replaceChild(oSettings.nTableWrapper, nHolding);
					}

					function _fnDetectHeader(aLayout, nThead) {
						var nTrs = $(nThead).children('tr');
						var nTr, nCell;
						var i, k, l, iLen, jLen, iColShifted, iColumn, iColspan, iRowspan;
						var bUnique;
						var fnShiftCol = function(a, i, j) {
							var k = a[i];
							while (k[j]) {
								j++;
							}
							return j;
						};

						aLayout.splice(0, aLayout.length);

						/* We know how many rows there are in the layout - so prep it */
						for ( i = 0, iLen = nTrs.length; i < iLen; i++) {
							aLayout.push([]);
						}

						/* Calculate a layout array */
						for ( i = 0, iLen = nTrs.length; i < iLen; i++) {
							nTr = nTrs[i];
							iColumn = 0;

							/* For every cell in the row... */
							nCell = nTr.firstChild;
							while (nCell) {
								if (nCell.nodeName.toUpperCase() == "TD" || nCell.nodeName.toUpperCase() == "TH") {
									/* Get the col and rowspan attributes from the DOM and sanitise them */
									iColspan = nCell.getAttribute('colspan') * 1;
									iRowspan = nCell.getAttribute('rowspan') * 1;
									iColspan = (!iColspan || iColspan === 0 || iColspan === 1) ? 1 : iColspan;
									iRowspan = (!iRowspan || iRowspan === 0 || iRowspan === 1) ? 1 : iRowspan;

									/* There might be colspan cells already in this row, so shift our target
									 * accordingly
									 */
									iColShifted = fnShiftCol(aLayout, i, iColumn);

									/* Cache calculation for unique columns */
									bUnique = iColspan === 1 ? true : false;

									/* If there is col / rowspan, copy the information into the layout grid */
									for ( l = 0; l < iColspan; l++) {
										for ( k = 0; k < iRowspan; k++) {
											aLayout[i+k][iColShifted + l] = {
												"cell" : nCell,
												"unique" : bUnique
											};
											aLayout[i + k].nTr = nTr;
										}
									}
								}
								nCell = nCell.nextSibling;
							}
						}
					}

					function _fnGetUniqueThs(oSettings, nHeader, aLayout) {
						var aReturn = [];
						if (!aLayout) {
							aLayout = oSettings.aoHeader;
							if (nHeader) {
								aLayout = [];
								_fnDetectHeader(aLayout, nHeader);
							}
						}

						for (var i = 0, iLen = aLayout.length; i < iLen; i++) {
							for (var j = 0, jLen = aLayout[i].length; j < jLen; j++) {
								if (aLayout[i][j].unique && (!aReturn[j] || !oSettings.bSortCellsTop)) {
									aReturn[j] = aLayout[i][j].cell;
								}
							}
						}

						return aReturn;
					}

					function _fnAjaxUpdate(oSettings) {
						if (oSettings.bAjaxDataGet) {
							oSettings.iDraw++;
							_fnProcessingDisplay(oSettings, true);
							var iColumns = oSettings.aoColumns.length;
							var aoData = _fnAjaxParameters(oSettings);
							_fnServerParams(oSettings, aoData);

							oSettings.fnServerData.call(oSettings.oInstance, oSettings.sAjaxSource, aoData, function(json) {
								_fnAjaxUpdateDraw(oSettings, json);
							}, oSettings);
							return false;
						} else {
							return true;
						}
					}

					function _fnAjaxParameters(oSettings) {
						var iColumns = oSettings.aoColumns.length;
						var aoData = [], mDataProp, aaSort, aDataSort;
						var i, j;

						aoData.push({
							"name" : "sEcho",
							"value" : oSettings.iDraw
						});
						aoData.push({
							"name" : "iColumns",
							"value" : iColumns
						});
						aoData.push({
							"name" : "sColumns",
							"value" : _fnColumnOrdering(oSettings)
						});
						aoData.push({
							"name" : "iDisplayStart",
							"value" : oSettings._iDisplayStart
						});
						aoData.push({
							"name" : "iDisplayLength",
							"value" : oSettings.oFeatures.bPaginate !== false ? oSettings._iDisplayLength : -1
						});

						for ( i = 0; i < iColumns; i++) {
							mDataProp = oSettings.aoColumns[i].mData;
							aoData.push({
								"name" : "mDataProp_" + i,
								"value" : typeof (mDataProp) === "function" ? 'function' : mDataProp
							});
						}

						/* Filtering */
						if (oSettings.oFeatures.bFilter !== false) {
							aoData.push({
								"name" : "sSearch",
								"value" : oSettings.oPreviousSearch.sSearch
							});
							aoData.push({
								"name" : "bRegex",
								"value" : oSettings.oPreviousSearch.bRegex
							});
							for ( i = 0; i < iColumns; i++) {
								aoData.push({
									"name" : "sSearch_" + i,
									"value" : oSettings.aoPreSearchCols[i].sSearch
								});
								aoData.push({
									"name" : "bRegex_" + i,
									"value" : oSettings.aoPreSearchCols[i].bRegex
								});
								aoData.push({
									"name" : "bSearchable_" + i,
									"value" : oSettings.aoColumns[i].bSearchable
								});
							}
						}

						/* Sorting */
						if (oSettings.oFeatures.bSort !== false) {
							var iCounter = 0;

							aaSort = (oSettings.aaSortingFixed !== null ) ? oSettings.aaSortingFixed.concat(oSettings.aaSorting) : oSettings.aaSorting.slice();

							for ( i = 0; i < aaSort.length; i++) {
								aDataSort = oSettings.aoColumns[aaSort[i][0]].aDataSort;

								for ( j = 0; j < aDataSort.length; j++) {
									aoData.push({
										"name" : "iSortCol_" + iCounter,
										"value" : aDataSort[j]
									});
									aoData.push({
										"name" : "sSortDir_" + iCounter,
										"value" : aaSort[i][1]
									});
									iCounter++;
								}
							}
							aoData.push({
								"name" : "iSortingCols",
								"value" : iCounter
							});

							for ( i = 0; i < iColumns; i++) {
								aoData.push({
									"name" : "bSortable_" + i,
									"value" : oSettings.aoColumns[i].bSortable
								});
							}
						}

						return aoData;
					}

					function _fnServerParams(oSettings, aoData) {
						_fnCallbackFire(oSettings, 'aoServerParams', 'serverParams', [aoData]);
					}

					function _fnAjaxUpdateDraw(oSettings, json) {
						if (json.sEcho !== undefined) {
							
							if (json.sEcho * 1 < oSettings.iDraw) {
								return;
							} else {
								oSettings.iDraw = json.sEcho * 1;
							}
						}

						if (!oSettings.oScroll.bInfinite || (oSettings.oScroll.bInfinite && (oSettings.bSorted || oSettings.bFiltered))) {
							_fnClearTable(oSettings);
						}
						oSettings._iRecordsTotal = parseInt(json.iTotalRecords, 10);
						oSettings._iRecordsDisplay = parseInt(json.iTotalDisplayRecords, 10);

						/* Determine if reordering is required */
						var sOrdering = _fnColumnOrdering(oSettings);
						var bReOrder = (json.sColumns !== undefined && sOrdering !== "" && json.sColumns != sOrdering );
						var aiIndex;
						if (bReOrder) {
							aiIndex = _fnReOrderIndex(oSettings, json.sColumns);
						}

						var aData = _fnGetObjectDataFn( oSettings.sAjaxDataProp )(json);
						for (var i = 0, iLen = aData.length; i < iLen; i++) {
							if (bReOrder) {
								/* If we need to re-order, then create a new array with the correct order and add it */
								var aDataSorted = [];
								for (var j = 0, jLen = oSettings.aoColumns.length; j < jLen; j++) {
									aDataSorted.push(aData[i][aiIndex[j]]);
								}
								_fnAddData(oSettings, aDataSorted);
							} else {
								/* No re-order required, sever got it "right" - just straight add */
								_fnAddData(oSettings, aData[i]);
							}
						}
						oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();

						oSettings.bAjaxDataGet = false;
						_fnDraw(oSettings);
						oSettings.bAjaxDataGet = true;
						_fnProcessingDisplay(oSettings, false);
					}

					function _fnFeatureHtmlFilter(oSettings) {
						var oPreviousSearch = oSettings.oPreviousSearch;

						var sSearchStr = oSettings.oLanguage.sSearch;
						sSearchStr = (sSearchStr.indexOf('_INPUT_') !== -1) ? sSearchStr.replace('_INPUT_', '<input type="text" />') : sSearchStr === "" ? '<input type="text" />' : sSearchStr + ' <input type="text" />';

						var nFilter = document.createElement('div');
						nFilter.className = oSettings.oClasses.sFilter;
						nFilter.innerHTML = '<label>' + sSearchStr + '</label>';
						if (!oSettings.aanFeatures.f) {
							nFilter.id = oSettings.sTableId + '_filter';
						}

						var jqFilter = $('input[type="text"]', nFilter);

						nFilter._DT_Input = jqFilter[0];

						jqFilter.val(oPreviousSearch.sSearch.replace('"', '&quot;'));
						jqFilter.bind('keyup.DT', function(e) {
							/* Update all other filter input elements for the new display */
							var n = oSettings.aanFeatures.f;
							var val = this.value === "" ? "" : this.value;
							// mental IE8 fix :-(

							for (var i = 0, iLen = n.length; i < iLen; i++) {
								if (n[i] != $(this).parents('div.dataTables_filter')[0]) {
									$(n[i]._DT_Input).val(val);
								}
							}

							/* Now do the filter */
							if (val != oPreviousSearch.sSearch) {
								_fnFilterComplete(oSettings, {
									"sSearch" : val,
									"bRegex" : oPreviousSearch.bRegex,
									"bSmart" : oPreviousSearch.bSmart,
									"bCaseInsensitive" : oPreviousSearch.bCaseInsensitive
								});
							}
						});

						jqFilter.attr('aria-controls', oSettings.sTableId).bind('keypress.DT', function(e) {
							/* Prevent form submission */
							if (e.keyCode == 13) {
								return false;
							}
						});

						return nFilter;
					}

					function _fnFilterComplete(oSettings, oInput, iForce) {
						var oPrevSearch = oSettings.oPreviousSearch;
						var aoPrevSearch = oSettings.aoPreSearchCols;
						var fnSaveFilter = function(oFilter) {
							/* Save the filtering values */
							oPrevSearch.sSearch = oFilter.sSearch;
							oPrevSearch.bRegex = oFilter.bRegex;
							oPrevSearch.bSmart = oFilter.bSmart;
							oPrevSearch.bCaseInsensitive = oFilter.bCaseInsensitive;
						};

						/* In server-side processing all filtering is done by the server, so no point hanging around here */
						if (!oSettings.oFeatures.bServerSide) {
							/* Global filter */
							_fnFilter(oSettings, oInput.sSearch, iForce, oInput.bRegex, oInput.bSmart, oInput.bCaseInsensitive);
							fnSaveFilter(oInput);

							/* Now do the individual column filter */
							for (var i = 0; i < oSettings.aoPreSearchCols.length; i++) {
								_fnFilterColumn(oSettings, aoPrevSearch[i].sSearch, i, aoPrevSearch[i].bRegex, aoPrevSearch[i].bSmart, aoPrevSearch[i].bCaseInsensitive);
							}

							/* Custom filtering */
							_fnFilterCustom(oSettings);
						} else {
							fnSaveFilter(oInput);
						}

						/* Tell the draw function we have been filtering */
						oSettings.bFiltered = true;
						$(oSettings.oInstance).trigger('filter', oSettings);

						/* Redraw the table */
						oSettings._iDisplayStart = 0;
						_fnCalculateEnd(oSettings);
						_fnDraw(oSettings);

						/* Rebuild search array 'offline' */
						_fnBuildSearchArray(oSettings, 0);
					}

					function _fnFilterCustom(oSettings) {
						var afnFilters = DataTable.ext.afnFiltering;
						var aiFilterColumns = _fnGetColumns(oSettings, 'bSearchable');

						for (var i = 0, iLen = afnFilters.length; i < iLen; i++) {
							var iCorrector = 0;
							for (var j = 0, jLen = oSettings.aiDisplay.length; j < jLen; j++) {
								var iDisIndex = oSettings.aiDisplay[j - iCorrector];
								var bTest = afnFilters[i](oSettings, _fnGetRowData(oSettings, iDisIndex, 'filter', aiFilterColumns), iDisIndex);

								/* Check if we should use this row based on the filtering function */
								if (!bTest) {
									oSettings.aiDisplay.splice(j - iCorrector, 1);
									iCorrector++;
								}
							}
						}
					}

					function _fnFilterColumn(oSettings, sInput, iColumn, bRegex, bSmart, bCaseInsensitive) {
						if (sInput === "") {
							return;
						}

						var iIndexCorrector = 0;
						var rpSearch = _fnFilterCreateSearch(sInput, bRegex, bSmart, bCaseInsensitive);

						for (var i = oSettings.aiDisplay.length - 1; i >= 0; i--) {
							var sData = _fnDataToSearch(_fnGetCellData(oSettings, oSettings.aiDisplay[i], iColumn, 'filter'), oSettings.aoColumns[iColumn].sType);
							if (! rpSearch.test(sData)) {
								oSettings.aiDisplay.splice(i, 1);
								iIndexCorrector++;
							}
						}
					}

					function _fnFilter(oSettings, sInput, iForce, bRegex, bSmart, bCaseInsensitive) {
						var i;
						var rpSearch = _fnFilterCreateSearch(sInput, bRegex, bSmart, bCaseInsensitive);
						var oPrevSearch = oSettings.oPreviousSearch;

						/* Check if we are forcing or not - optional parameter */
						if (!iForce) {
							iForce = 0;
						}

						/* Need to take account of custom filtering functions - always filter */
						if (DataTable.ext.afnFiltering.length !== 0) {
							iForce = 1;
						}

						/*
						 * If the input is blank - we want the full data set
						 */
						if (sInput.length <= 0) {
							oSettings.aiDisplay.splice(0, oSettings.aiDisplay.length);
							oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
						} else {
							/*
							 * We are starting a new search or the new search string is smaller
							 * then the old one (i.e. delete). Search from the master array
							 */
							if (oSettings.aiDisplay.length == oSettings.aiDisplayMaster.length || oPrevSearch.sSearch.length > sInput.length || iForce == 1 || sInput.indexOf(oPrevSearch.sSearch) !== 0) {
								/* Nuke the old display array - we are going to rebuild it */
								oSettings.aiDisplay.splice(0, oSettings.aiDisplay.length);

								/* Force a rebuild of the search array */
								_fnBuildSearchArray(oSettings, 1);

								/* Search through all records to populate the search array
								 * The the oSettings.aiDisplayMaster and asDataSearch arrays have 1 to 1
								 * mapping
								 */
								for ( i = 0; i < oSettings.aiDisplayMaster.length; i++) {
									if (rpSearch.test(oSettings.asDataSearch[i])) {
										oSettings.aiDisplay.push(oSettings.aiDisplayMaster[i]);
									}
								}
							} else {
								/* Using old search array - refine it - do it this way for speed
								 * Don't have to search the whole master array again
								 */
								var iIndexCorrector = 0;

								/* Search the current results */
								for ( i = 0; i < oSettings.asDataSearch.length; i++) {
									if (! rpSearch.test(oSettings.asDataSearch[i])) {
										oSettings.aiDisplay.splice(i - iIndexCorrector, 1);
										iIndexCorrector++;
									}
								}
							}
						}
					}

					function _fnBuildSearchArray(oSettings, iMaster) {
						if (!oSettings.oFeatures.bServerSide) {
							/* Clear out the old data */
							oSettings.asDataSearch = [];

							var aiFilterColumns = _fnGetColumns(oSettings, 'bSearchable');
							var aiIndex = (iMaster === 1) ? oSettings.aiDisplayMaster : oSettings.aiDisplay;

							for (var i = 0, iLen = aiIndex.length; i < iLen; i++) {
								oSettings.asDataSearch[i] = _fnBuildSearchRow(oSettings, _fnGetRowData(oSettings, aiIndex[i], 'filter', aiFilterColumns));
							}
						}
					}

					function _fnBuildSearchRow(oSettings, aData) {
						var sSearch = aData.join('  ');

						/* If it looks like there is an HTML entity in the string, attempt to decode it */
						if (sSearch.indexOf('&') !== -1) {
							sSearch = $('<div>').html(sSearch).text();
						}

						// Strip newline characters
						return sSearch.replace(/[\n\r]/g, " ");
					}

					function _fnFilterCreateSearch(sSearch, bRegex, bSmart, bCaseInsensitive) {
						var asSearch, sRegExpString;

						if (bSmart) {
							/* Generate the regular expression to use. Something along the lines of:
							 * ^(?=.*?\bone\b)(?=.*?\btwo\b)(?=.*?\bthree\b).*$
							 */
							asSearch = bRegex ? sSearch.split(' ') : _fnEscapeRegex(sSearch).split(' ');
							sRegExpString = '^(?=.*?' + asSearch.join(')(?=.*?') + ').*$';
							return new RegExp(sRegExpString, bCaseInsensitive ? "i" : "");
						} else {
							sSearch = bRegex ? sSearch : _fnEscapeRegex(sSearch);
							return new RegExp(sSearch, bCaseInsensitive ? "i" : "");
						}
					}

					function _fnDataToSearch(sData, sType) {
						if ( typeof DataTable.ext.ofnSearch[sType] === "function") {
							return DataTable.ext.ofnSearch[sType](sData);
						} else if (sData === null) {
							return '';
						} else if (sType == "html") {
							return sData.replace(/[\r\n]/g, " ").replace(/<.*?>/g, "");
						} else if ( typeof sData === "string") {
							return sData.replace(/[\r\n]/g, " ");
						}
						return sData;
					}

					function _fnEscapeRegex(sVal) {
						var acEscape = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\', '$', '^', '-'];
						var reReplace = new RegExp('(\\' + acEscape.join('|\\') + ')', 'g');
						return sVal.replace(reReplace, '\\$1');
					}

					function _fnFeatureHtmlInfo(oSettings) {
						var nInfo = document.createElement('div');
						nInfo.className = oSettings.oClasses.sInfo;

						/* Actions that are to be taken once only for this feature */
						if (!oSettings.aanFeatures.i) {
							/* Add draw callback */
							oSettings.aoDrawCallback.push({
								"fn" : _fnUpdateInfo,
								"sName" : "information"
							});

							/* Add id */
							nInfo.id = oSettings.sTableId + '_info';
						}
						oSettings.nTable.setAttribute('aria-describedby', oSettings.sTableId + '_info');

						return nInfo;
					}

					function _fnUpdateInfo(oSettings) {
						/* Show information about the table */
						if (!oSettings.oFeatures.bInfo || oSettings.aanFeatures.i.length === 0) {
							return;
						}

						var oLang = oSettings.oLanguage, iStart = oSettings._iDisplayStart + 1, iEnd = oSettings.fnDisplayEnd(), iMax = oSettings.fnRecordsTotal(), iTotal = oSettings.fnRecordsDisplay(), sOut;

						if (iTotal === 0) {
							/* Empty record set */
							sOut = oLang.sInfoEmpty;
						} else {
							/* Normal record set */
							sOut = oLang.sInfo;
						}

						if (iTotal != iMax) {
							/* Record set after filtering */
							sOut += ' ' + oLang.sInfoFiltered;
						}

						// Convert the macros
						sOut += oLang.sInfoPostFix;
						sOut = _fnInfoMacros(oSettings, sOut);

						if (oLang.fnInfoCallback !== null) {
							sOut = oLang.fnInfoCallback.call(oSettings.oInstance, oSettings, iStart, iEnd, iMax, iTotal, sOut);
						}

						var n = oSettings.aanFeatures.i;
						for (var i = 0, iLen = n.length; i < iLen; i++) {
							$(n[i]).html(sOut);
						}
					}

					function _fnInfoMacros(oSettings, str) {
						var iStart = oSettings._iDisplayStart + 1, sStart = oSettings.fnFormatNumber(iStart), iEnd = oSettings.fnDisplayEnd(), sEnd = oSettings.fnFormatNumber(iEnd), iTotal = oSettings.fnRecordsDisplay(), sTotal = oSettings.fnFormatNumber(iTotal), iMax = oSettings.fnRecordsTotal(), sMax = oSettings.fnFormatNumber(iMax);

						// When infinite scrolling, we are always starting at 1. _iDisplayStart is used only
						// internally
						if (oSettings.oScroll.bInfinite) {
							sStart = oSettings.fnFormatNumber(1);
						}

						return str.replace(/_START_/g, sStart).replace(/_END_/g, sEnd).replace(/_TOTAL_/g, sTotal).replace(/_MAX_/g, sMax);
					}

					function _fnInitialise(oSettings) {
						var i, iLen, iAjaxStart = oSettings.iInitDisplayStart;

						/* Ensure that the table data is fully initialised */
						if (oSettings.bInitialised === false) {
							setTimeout(function() {
								_fnInitialise(oSettings);
							}, 200);
							return;
						}

						/* Show the display HTML options */
						_fnAddOptionsHtml(oSettings);

						/* Build and draw the header / footer for the table */
						_fnBuildHead(oSettings);
						_fnDrawHead(oSettings, oSettings.aoHeader);
						if (oSettings.nTFoot) {
							_fnDrawHead(oSettings, oSettings.aoFooter);
						}

						/* Okay to show that something is going on now */
						_fnProcessingDisplay(oSettings, true);

						/* Calculate sizes for columns */
						if (oSettings.oFeatures.bAutoWidth) {
							_fnCalculateColumnWidths(oSettings);
						}

						for ( i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
							if (oSettings.aoColumns[i].sWidth !== null) {
								oSettings.aoColumns[i].nTh.style.width = _fnStringToCss(oSettings.aoColumns[i].sWidth);
							}
						}

						if (oSettings.oFeatures.bSort) {
							_fnSort(oSettings);
						} else if (oSettings.oFeatures.bFilter) {
							_fnFilterComplete(oSettings, oSettings.oPreviousSearch);
						} else {
							oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
							_fnCalculateEnd(oSettings);
							_fnDraw(oSettings);
						}

						/* if there is an ajax source load the data */
						if (oSettings.sAjaxSource !== null && !oSettings.oFeatures.bServerSide) {
							var aoData = [];
							_fnServerParams(oSettings, aoData);
							oSettings.fnServerData.call(oSettings.oInstance, oSettings.sAjaxSource, aoData, function(json) {
								var aData = (oSettings.sAjaxDataProp !== "") ? _fnGetObjectDataFn( oSettings.sAjaxDataProp )(json) : json;

								/* Got the data - add it to the table */
								for ( i = 0; i < aData.length; i++) {
									_fnAddData(oSettings, aData[i]);
								}

								/* Reset the init display for cookie saving. We've already done a filter, and
								 * therefore cleared it before. So we need to make it appear 'fresh'
								 */
								oSettings.iInitDisplayStart = iAjaxStart;

								if (oSettings.oFeatures.bSort) {
									_fnSort(oSettings);
								} else {
									oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
									_fnCalculateEnd(oSettings);
									_fnDraw(oSettings);
								}

								_fnProcessingDisplay(oSettings, false);
								_fnInitComplete(oSettings, json);
							}, oSettings);
							return;
						}

						/* Server-side processing initialisation complete is done at the end of _fnDraw */
						if (!oSettings.oFeatures.bServerSide) {
							_fnProcessingDisplay(oSettings, false);
							_fnInitComplete(oSettings);
						}
					}

					function _fnInitComplete(oSettings, json) {
						oSettings._bInitComplete = true;
						_fnCallbackFire(oSettings, 'aoInitComplete', 'init', [oSettings, json]);
					}

					function _fnLanguageCompat(oLanguage) {
						var oDefaults = DataTable.defaults.oLanguage;

						/* Backwards compatibility - if there is no sEmptyTable given, then use the same as
						 * sZeroRecords - assuming that is given.
						 */
						if (!oLanguage.sEmptyTable && oLanguage.sZeroRecords && oDefaults.sEmptyTable === "No data available") {
							_fnMap(oLanguage, oLanguage, 'sZeroRecords', 'sEmptyTable');
						}

						/* Likewise with loading records */
						if (!oLanguage.sLoadingRecords && oLanguage.sZeroRecords && oDefaults.sLoadingRecords === "Loading...") {
							_fnMap(oLanguage, oLanguage, 'sZeroRecords', 'sLoadingRecords');
						}
					}

					function _fnFeatureHtmlLength(oSettings) {
						if (oSettings.oScroll.bInfinite) {
							return null;
						}

						/* This can be overruled by not using the _MENU_ var/macro in the language variable */
						var sName = 'name="' + oSettings.sTableId + '_length"';
						var sStdMenu = '<select size="1" ' + sName + '>';
						var i, iLen;
						var aLengthMenu = oSettings.aLengthMenu;

						if (aLengthMenu.length == 2 && typeof aLengthMenu[0] === 'object' && typeof aLengthMenu[1] === 'object') {
							for ( i = 0, iLen = aLengthMenu[0].length; i < iLen; i++) {
								sStdMenu += '<option value="' + aLengthMenu[0][i] + '">' + aLengthMenu[1][i] + '</option>';
							}
						} else {
							for ( i = 0, iLen = aLengthMenu.length; i < iLen; i++) {
								sStdMenu += '<option value="' + aLengthMenu[i] + '">' + aLengthMenu[i] + '</option>';
							}
						}
						sStdMenu += '</select>';

						var nLength = document.createElement('div');
						if (!oSettings.aanFeatures.l) {
							nLength.id = oSettings.sTableId + '_length';
						}
						nLength.className = oSettings.oClasses.sLength;
						nLength.innerHTML = '<label>' + oSettings.oLanguage.sLengthMenu.replace('_MENU_', sStdMenu) + '</label>';

						$('select option[value="' + oSettings._iDisplayLength + '"]', nLength).attr("selected", true);

						$('select', nLength).bind('change.DT', function(e) {
							var iVal = $(this).val();

							/* Update all other length options for the new display */
							var n = oSettings.aanFeatures.l;
							for ( i = 0, iLen = n.length; i < iLen; i++) {
								if (n[i] != this.parentNode) {
									$('select', n[i]).val(iVal);
								}
							}

							/* Redraw the table */
							oSettings._iDisplayLength = parseInt(iVal, 10);
							_fnCalculateEnd(oSettings);

							/* If we have space to show extra rows (backing up from the end point - then do so */
							if (oSettings.fnDisplayEnd() == oSettings.fnRecordsDisplay()) {
								oSettings._iDisplayStart = oSettings.fnDisplayEnd() - oSettings._iDisplayLength;
								if (oSettings._iDisplayStart < 0) {
									oSettings._iDisplayStart = 0;
								}
							}

							if (oSettings._iDisplayLength == -1) {
								oSettings._iDisplayStart = 0;
							}

							_fnDraw(oSettings);
						});

						$('select', nLength).attr('aria-controls', oSettings.sTableId);

						return nLength;
					}

					function _fnCalculateEnd(oSettings) {
						if (oSettings.oFeatures.bPaginate === false) {
							oSettings._iDisplayEnd = oSettings.aiDisplay.length;
						} else {
							/* Set the end point of the display - based on how many elements there are
							 * still to display
							 */
							if (oSettings._iDisplayStart + oSettings._iDisplayLength > oSettings.aiDisplay.length || oSettings._iDisplayLength == -1) {
								oSettings._iDisplayEnd = oSettings.aiDisplay.length;
							} else {
								oSettings._iDisplayEnd = oSettings._iDisplayStart + oSettings._iDisplayLength;
							}
						}
					}

					function _fnFeatureHtmlPaginate(oSettings) {
						if (oSettings.oScroll.bInfinite) {
							return null;
						}

						var nPaginate = document.createElement('div');
						nPaginate.className = oSettings.oClasses.sPaging + oSettings.sPaginationType;

						DataTable.ext.oPagination[oSettings.sPaginationType].fnInit(oSettings, nPaginate, function(oSettings) {
							_fnCalculateEnd(oSettings);
							_fnDraw(oSettings);
						});

						/* Add a draw callback for the pagination on first instance, to update the paging display */
						if (!oSettings.aanFeatures.p) {
							oSettings.aoDrawCallback.push({
								"fn" : function(oSettings) {
									DataTable.ext.oPagination[oSettings.sPaginationType].fnUpdate(oSettings, function(oSettings) {
										_fnCalculateEnd(oSettings);
										_fnDraw(oSettings);
									});
								},
								"sName" : "pagination"
							});
						}
						return nPaginate;
					}

					function _fnPageChange(oSettings, mAction) {
						var iOldStart = oSettings._iDisplayStart;

						if ( typeof mAction === "number") {
							oSettings._iDisplayStart = mAction * oSettings._iDisplayLength;
							if (oSettings._iDisplayStart > oSettings.fnRecordsDisplay()) {
								oSettings._iDisplayStart = 0;
							}
						} else if (mAction == "first") {
							oSettings._iDisplayStart = 0;
						} else if (mAction == "previous") {
							oSettings._iDisplayStart = oSettings._iDisplayLength >= 0 ? oSettings._iDisplayStart - oSettings._iDisplayLength : 0;

							/* Correct for under-run */
							if (oSettings._iDisplayStart < 0) {
								oSettings._iDisplayStart = 0;
							}
						} else if (mAction == "next") {
							if (oSettings._iDisplayLength >= 0) {
								/* Make sure we are not over running the display array */
								if (oSettings._iDisplayStart + oSettings._iDisplayLength < oSettings.fnRecordsDisplay()) {
									oSettings._iDisplayStart += oSettings._iDisplayLength;
								}
							} else {
								oSettings._iDisplayStart = 0;
							}
						} else if (mAction == "last") {
							if (oSettings._iDisplayLength >= 0) {
								var iPages = parseInt((oSettings.fnRecordsDisplay() - 1) / oSettings._iDisplayLength, 10) + 1;
								oSettings._iDisplayStart = (iPages - 1) * oSettings._iDisplayLength;
							} else {
								oSettings._iDisplayStart = 0;
							}
						} else {
							_fnLog(oSettings, 0, "Unknown paging action: " + mAction);
						}
						$(oSettings.oInstance).trigger('page', oSettings);

						return iOldStart != oSettings._iDisplayStart;
					}

					function _fnFeatureHtmlProcessing(oSettings) {
						var nProcessing = document.createElement('div');

						if (!oSettings.aanFeatures.r) {
							nProcessing.id = oSettings.sTableId + '_processing';
						}
						nProcessing.innerHTML = oSettings.oLanguage.sProcessing;
						nProcessing.className = oSettings.oClasses.sProcessing;
						oSettings.nTable.parentNode.insertBefore(nProcessing, oSettings.nTable);

						return nProcessing;
					}

					function _fnProcessingDisplay(oSettings, bShow) {
						if (oSettings.oFeatures.bProcessing) {
							var an = oSettings.aanFeatures.r;
							for (var i = 0, iLen = an.length; i < iLen; i++) {
								an[i].style.visibility = bShow ? "visible" : "hidden";
							}
						}

						$(oSettings.oInstance).trigger('processing', [oSettings, bShow]);
					}

					function _fnFeatureHtmlTable(oSettings) {
						/* Check if scrolling is enabled or not - if not then leave the DOM unaltered */
						if (oSettings.oScroll.sX === "" && oSettings.oScroll.sY === "") {
							return oSettings.nTable;
						}

						var nScroller = document.createElement('div'), nScrollHead = document.createElement('div'), nScrollHeadInner = document.createElement('div'), nScrollBody = document.createElement('div'), nScrollFoot = document.createElement('div'), nScrollFootInner = document.createElement('div'), nScrollHeadTable = oSettings.nTable.cloneNode(false), nScrollFootTable = oSettings.nTable.cloneNode(false), nThead = oSettings.nTable.getElementsByTagName('thead')[0], nTfoot = oSettings.nTable.getElementsByTagName('tfoot').length === 0 ? null : oSettings.nTable.getElementsByTagName('tfoot')[0], oClasses = oSettings.oClasses;

						nScrollHead.appendChild(nScrollHeadInner);
						nScrollFoot.appendChild(nScrollFootInner);
						nScrollBody.appendChild(oSettings.nTable);
						nScroller.appendChild(nScrollHead);
						nScroller.appendChild(nScrollBody);
						nScrollHeadInner.appendChild(nScrollHeadTable);
						nScrollHeadTable.appendChild(nThead);
						if (nTfoot !== null) {
							nScroller.appendChild(nScrollFoot);
							nScrollFootInner.appendChild(nScrollFootTable);
							nScrollFootTable.appendChild(nTfoot);
						}

						nScroller.className = oClasses.sScrollWrapper;
						nScrollHead.className = oClasses.sScrollHead;
						nScrollHeadInner.className = oClasses.sScrollHeadInner;
						nScrollBody.className = oClasses.sScrollBody;
						nScrollFoot.className = oClasses.sScrollFoot;
						nScrollFootInner.className = oClasses.sScrollFootInner;

						if (oSettings.oScroll.bAutoCss) {
							nScrollHead.style.overflow = "hidden";
							nScrollHead.style.position = "relative";
							nScrollFoot.style.overflow = "hidden";
							nScrollBody.style.overflow = "auto";
						}

						nScrollHead.style.border = "0";
						nScrollHead.style.width = "100%";
						nScrollFoot.style.border = "0";
						nScrollHeadInner.style.width = oSettings.oScroll.sXInner !== "" ? oSettings.oScroll.sXInner : "100%";
						/* will be overwritten */

						/* Modify attributes to respect the clones */
						nScrollHeadTable.removeAttribute('id');
						nScrollHeadTable.style.marginLeft = "0";
						oSettings.nTable.style.marginLeft = "0";
						if (nTfoot !== null) {
							nScrollFootTable.removeAttribute('id');
							nScrollFootTable.style.marginLeft = "0";
						}

						var nCaption = $(oSettings.nTable).children('caption');
						if (nCaption.length > 0) {
							nCaption = nCaption[0];
							if (nCaption._captionSide === "top") {
								nScrollHeadTable.appendChild(nCaption);
							} else if (nCaption._captionSide === "bottom" && nTfoot) {
								nScrollFootTable.appendChild(nCaption);
							}
						}

						if (oSettings.oScroll.sX !== "") {
							nScrollHead.style.width = _fnStringToCss(oSettings.oScroll.sX);
							nScrollBody.style.width = _fnStringToCss(oSettings.oScroll.sX);

							if (nTfoot !== null) {
								nScrollFoot.style.width = _fnStringToCss(oSettings.oScroll.sX);
							}

							/* When the body is scrolled, then we also want to scroll the headers */
							$(nScrollBody).scroll(function(e) {
								nScrollHead.scrollLeft = this.scrollLeft;

								if (nTfoot !== null) {
									nScrollFoot.scrollLeft = this.scrollLeft;
								}
							});
						}

						/* When yscrolling, add the height */
						if (oSettings.oScroll.sY !== "") {
							nScrollBody.style.height = _fnStringToCss(oSettings.oScroll.sY);
						}

						/* Redraw - align columns across the tables */
						oSettings.aoDrawCallback.push({
							"fn" : _fnScrollDraw,
							"sName" : "scrolling"
						});

						/* Infinite scrolling event handlers */
						if (oSettings.oScroll.bInfinite) {
							$(nScrollBody).scroll(function() {
								/* Use a blocker to stop scrolling from loading more data while other data is still loading */
								if (!oSettings.bDrawing && $(this).scrollTop() !== 0) {
									/* Check if we should load the next data set */
									if ($(this).scrollTop() + $(this).height() > $(oSettings.nTable).height() - oSettings.oScroll.iLoadGap) {
										/* Only do the redraw if we have to - we might be at the end of the data */
										if (oSettings.fnDisplayEnd() < oSettings.fnRecordsDisplay()) {
											_fnPageChange(oSettings, 'next');
											_fnCalculateEnd(oSettings);
											_fnDraw(oSettings);
										}
									}
								}
							});
						}

						oSettings.nScrollHead = nScrollHead;
						oSettings.nScrollFoot = nScrollFoot;

						return nScroller;
					}

					function _fnScrollDraw(o) {
						var nScrollHeadInner = o.nScrollHead.getElementsByTagName('div')[0], nScrollHeadTable = nScrollHeadInner.getElementsByTagName('table')[0], nScrollBody = o.nTable.parentNode, i, iLen, j, jLen, anHeadToSize, anHeadSizers, anFootSizers, anFootToSize, oStyle, iVis, nTheadSize, nTfootSize, iWidth, aApplied = [], aAppliedFooter = [], iSanityWidth, nScrollFootInner = (o.nTFoot !== null) ? o.nScrollFoot.getElementsByTagName('div')[0] : null, nScrollFootTable = (o.nTFoot !== null) ? nScrollFootInner.getElementsByTagName('table')[0] : null, ie67 = o.oBrowser.bScrollOversize, zeroOut = function(nSizer) {
							oStyle = nSizer.style;
							oStyle.paddingTop = "0";
							oStyle.paddingBottom = "0";
							oStyle.borderTopWidth = "0";
							oStyle.borderBottomWidth = "0";
							oStyle.height = 0;
						};

						/* Remove the old minimised thead and tfoot elements in the inner table */
						$(o.nTable).children('thead, tfoot').remove();

						/* Clone the current header and footer elements and then place it into the inner table */
						nTheadSize = $(o.nTHead).clone()[0];
						o.nTable.insertBefore(nTheadSize, o.nTable.childNodes[0]);
						anHeadToSize = o.nTHead.getElementsByTagName('tr');
						anHeadSizers = nTheadSize.getElementsByTagName('tr');

						if (o.nTFoot !== null) {
							nTfootSize = $(o.nTFoot).clone()[0];
							o.nTable.insertBefore(nTfootSize, o.nTable.childNodes[1]);
							anFootToSize = o.nTFoot.getElementsByTagName('tr');
							anFootSizers = nTfootSize.getElementsByTagName('tr');
						}

						if (o.oScroll.sX === "") {
							nScrollBody.style.width = '100%';
							nScrollHeadInner.parentNode.style.width = '100%';
						}

						var nThs = _fnGetUniqueThs(o, nTheadSize);
						for ( i = 0, iLen = nThs.length; i < iLen; i++) {
							iVis = _fnVisibleToColumnIndex(o, i);
							nThs[i].style.width = o.aoColumns[iVis].sWidth;
						}

						if (o.nTFoot !== null) {
							_fnApplyToChildren(function(n) {
								n.style.width = "";
							}, anFootSizers);
						}

						if (o.oScroll.bCollapse && o.oScroll.sY !== "") {
							nScrollBody.style.height = (nScrollBody.offsetHeight + o.nTHead.offsetHeight) + "px";
						}

						/* Size the table as a whole */
						iSanityWidth = $(o.nTable).outerWidth();
						if (o.oScroll.sX === "") {
							/* No x scrolling */
							o.nTable.style.width = "100%";

							
							if (ie67 && ($('tbody', nScrollBody).height() > nScrollBody.offsetHeight || $(nScrollBody).css('overflow-y') == "scroll")) {
								o.nTable.style.width = _fnStringToCss($(o.nTable).outerWidth() - o.oScroll.iBarWidth);
							}
						} else {
							if (o.oScroll.sXInner !== "") {
								/* x scroll inner has been given - use it */
								o.nTable.style.width = _fnStringToCss(o.oScroll.sXInner);
							} else if (iSanityWidth == $(nScrollBody).width() && $(nScrollBody).height() < $(o.nTable).height()) {
								/* There is y-scrolling - try to take account of the y scroll bar */
								o.nTable.style.width = _fnStringToCss(iSanityWidth - o.oScroll.iBarWidth);
								if ($(o.nTable).outerWidth() > iSanityWidth - o.oScroll.iBarWidth) {
									/* Not possible to take account of it */
									o.nTable.style.width = _fnStringToCss(iSanityWidth);
								}
							} else {
								/* All else fails */
								o.nTable.style.width = _fnStringToCss(iSanityWidth);
							}
						}

						iSanityWidth = $(o.nTable).outerWidth();

						_fnApplyToChildren(zeroOut, anHeadSizers);

						_fnApplyToChildren(function(nSizer) {
							aApplied.push(_fnStringToCss($(nSizer).width()));
						}, anHeadSizers);

						_fnApplyToChildren(function(nToSize, i) {
							nToSize.style.width = aApplied[i];
						}, anHeadToSize);

						$(anHeadSizers).height(0);

						/* Same again with the footer if we have one */
						if (o.nTFoot !== null) {
							_fnApplyToChildren(zeroOut, anFootSizers);

							_fnApplyToChildren(function(nSizer) {
								aAppliedFooter.push(_fnStringToCss($(nSizer).width()));
							}, anFootSizers);

							_fnApplyToChildren(function(nToSize, i) {
								nToSize.style.width = aAppliedFooter[i];
							}, anFootToSize);

							$(anFootSizers).height(0);
						}

						_fnApplyToChildren(function(nSizer, i) {
							nSizer.innerHTML = "";
							nSizer.style.width = aApplied[i];
						}, anHeadSizers);

						if (o.nTFoot !== null) {
							_fnApplyToChildren(function(nSizer, i) {
								nSizer.innerHTML = "";
								nSizer.style.width = aAppliedFooter[i];
							}, anFootSizers);
						}

						if ($(o.nTable).outerWidth() < iSanityWidth) {
							/* The min width depends upon if we have a vertical scrollbar visible or not */
							var iCorrection = ((nScrollBody.scrollHeight > nScrollBody.offsetHeight || $(nScrollBody).css('overflow-y') == "scroll")) ? iSanityWidth + o.oScroll.iBarWidth : iSanityWidth;

							/* IE6/7 are a law unto themselves... */
							if (ie67 && (nScrollBody.scrollHeight > nScrollBody.offsetHeight || $(nScrollBody).css('overflow-y') == "scroll")) {
								o.nTable.style.width = _fnStringToCss(iCorrection - o.oScroll.iBarWidth);
							}

							/* Apply the calculated minimum width to the table wrappers */
							nScrollBody.style.width = _fnStringToCss(iCorrection);
							o.nScrollHead.style.width = _fnStringToCss(iCorrection);

							if (o.nTFoot !== null) {
								o.nScrollFoot.style.width = _fnStringToCss(iCorrection);
							}

							/* And give the user a warning that we've stopped the table getting too small */
							if (o.oScroll.sX === "") {
								_fnLog(o, 1, "The table cannot fit into the current element which will cause column" + " misalignment. The table has been drawn at its minimum possible width.");
							} else if (o.oScroll.sXInner !== "") {
								_fnLog(o, 1, "The table cannot fit into the current element which will cause column" + " misalignment. Increase the sScrollXInner value or remove it to allow automatic" + " calculation");
							}
						} else {
							nScrollBody.style.width = _fnStringToCss('100%');
							o.nScrollHead.style.width = _fnStringToCss('100%');

							if (o.nTFoot !== null) {
								o.nScrollFoot.style.width = _fnStringToCss('100%');
							}
						}

						if (o.oScroll.sY === "") {
							if (ie67) {
								nScrollBody.style.height = _fnStringToCss(o.nTable.offsetHeight + o.oScroll.iBarWidth);
							}
						}

						if (o.oScroll.sY !== "" && o.oScroll.bCollapse) {
							nScrollBody.style.height = _fnStringToCss(o.oScroll.sY);

							var iExtra = (o.oScroll.sX !== "" && o.nTable.offsetWidth > nScrollBody.offsetWidth) ? o.oScroll.iBarWidth : 0;
							if (o.nTable.offsetHeight < nScrollBody.offsetHeight) {
								nScrollBody.style.height = _fnStringToCss(o.nTable.offsetHeight + iExtra);
							}
						}

						/* Finally set the width's of the header and footer tables */
						var iOuterWidth = $(o.nTable).outerWidth();
						nScrollHeadTable.style.width = _fnStringToCss(iOuterWidth);
						nScrollHeadInner.style.width = _fnStringToCss(iOuterWidth);

						// Figure out if there are scrollbar present - if so then we need a the header and footer to
						// provide a bit more space to allow "overflow" scrolling (i.e. past the scrollbar)
						var bScrolling = $(o.nTable).height() > nScrollBody.clientHeight || $(nScrollBody).css('overflow-y') == "scroll";
						nScrollHeadInner.style.paddingRight = bScrolling ? o.oScroll.iBarWidth + "px" : "0px";

						if (o.nTFoot !== null) {
							nScrollFootTable.style.width = _fnStringToCss(iOuterWidth);
							nScrollFootInner.style.width = _fnStringToCss(iOuterWidth);
							nScrollFootInner.style.paddingRight = bScrolling ? o.oScroll.iBarWidth + "px" : "0px";
						}

						/* Adjust the position of the header in case we loose the y-scrollbar */
						$(nScrollBody).scroll();

						/* If sorting or filtering has occurred, jump the scrolling back to the top */
						if (o.bSorted || o.bFiltered) {
							nScrollBody.scrollTop = 0;
						}
					}

					function _fnApplyToChildren(fn, an1, an2) {
						var index = 0, i = 0, iLen = an1.length;
						var nNode1, nNode2;

						while (i < iLen) {
							nNode1 = an1[i].firstChild;
							nNode2 = an2 ? an2[i].firstChild : null;
							while (nNode1) {
								if (nNode1.nodeType === 1) {
									if (an2) {
										fn(nNode1, nNode2, index);
									} else {
										fn(nNode1, index);
									}
									index++;
								}
								nNode1 = nNode1.nextSibling;
								nNode2 = an2 ? nNode2.nextSibling : null;
							}
							i++;
						}
					}

					function _fnConvertToWidth(sWidth, nParent) {
						if (!sWidth || sWidth === null || sWidth === '') {
							return 0;
						}

						if (!nParent) {
							nParent = document.body;
						}

						var iWidth;
						var nTmp = document.createElement("div");
						nTmp.style.width = _fnStringToCss(sWidth);

						nParent.appendChild(nTmp);
						iWidth = nTmp.offsetWidth;
						nParent.removeChild(nTmp);

						return (iWidth );
					}

					function _fnCalculateColumnWidths(oSettings) {
						var iTableWidth = oSettings.nTable.offsetWidth;
						var iUserInputs = 0;
						var iTmpWidth;
						var iVisibleColumns = 0;
						var iColums = oSettings.aoColumns.length;
						var i, iIndex, iCorrector, iWidth;
						var oHeaders = $('th', oSettings.nTHead);
						var widthAttr = oSettings.nTable.getAttribute('width');
						var nWrapper = oSettings.nTable.parentNode;

						/* Convert any user input sizes into pixel sizes */
						for ( i = 0; i < iColums; i++) {
							if (oSettings.aoColumns[i].bVisible) {
								iVisibleColumns++;

								if (oSettings.aoColumns[i].sWidth !== null) {
									iTmpWidth = _fnConvertToWidth(oSettings.aoColumns[i].sWidthOrig, nWrapper);
									if (iTmpWidth !== null) {
										oSettings.aoColumns[i].sWidth = _fnStringToCss(iTmpWidth);
									}

									iUserInputs++;
								}
							}
						}

						if (iColums == oHeaders.length && iUserInputs === 0 && iVisibleColumns == iColums && oSettings.oScroll.sX === "" && oSettings.oScroll.sY === "") {
							for ( i = 0; i < oSettings.aoColumns.length; i++) {
								iTmpWidth = $(oHeaders[i]).width();
								if (iTmpWidth !== null) {
									oSettings.aoColumns[i].sWidth = _fnStringToCss(iTmpWidth);
								}
							}
						} else {
							
							var nCalcTmp = oSettings.nTable.cloneNode(false), nTheadClone = oSettings.nTHead.cloneNode(true), nBody = document.createElement('tbody'), nTr = document.createElement('tr'), nDivSizing;

							nCalcTmp.removeAttribute("id");
							nCalcTmp.appendChild(nTheadClone);
							if (oSettings.nTFoot !== null) {
								nCalcTmp.appendChild(oSettings.nTFoot.cloneNode(true));
								_fnApplyToChildren(function(n) {
									n.style.width = "";
								}, nCalcTmp.getElementsByTagName('tr'));
							}

							nCalcTmp.appendChild(nBody);
							nBody.appendChild(nTr);

							/* Remove any sizing that was previously applied by the styles */
							var jqColSizing = $('thead th', nCalcTmp);
							if (jqColSizing.length === 0) {
								jqColSizing = $('tbody tr:eq(0)>td', nCalcTmp);
							}

							/* Apply custom sizing to the cloned header */
							var nThs = _fnGetUniqueThs(oSettings, nTheadClone);
							iCorrector = 0;
							for ( i = 0; i < iColums; i++) {
								var oColumn = oSettings.aoColumns[i];
								if (oColumn.bVisible && oColumn.sWidthOrig !== null && oColumn.sWidthOrig !== "") {
									nThs[i - iCorrector].style.width = _fnStringToCss(oColumn.sWidthOrig);
								} else if (oColumn.bVisible) {
									nThs[i - iCorrector].style.width = "";
								} else {
									iCorrector++;
								}
							}

							/* Find the biggest td for each column and put it into the table */
							for ( i = 0; i < iColums; i++) {
								if (oSettings.aoColumns[i].bVisible) {
									var nTd = _fnGetWidestNode(oSettings, i);
									if (nTd !== null) {
										nTd = nTd.cloneNode(true);
										if (oSettings.aoColumns[i].sContentPadding !== "") {
											nTd.innerHTML += oSettings.aoColumns[i].sContentPadding;
										}
										nTr.appendChild(nTd);
									}
								}
							}

							/* Build the table and 'display' it */
							nWrapper.appendChild(nCalcTmp);

							if (oSettings.oScroll.sX !== "" && oSettings.oScroll.sXInner !== "") {
								nCalcTmp.style.width = _fnStringToCss(oSettings.oScroll.sXInner);
							} else if (oSettings.oScroll.sX !== "") {
								nCalcTmp.style.width = "";
								if ($(nCalcTmp).width() < nWrapper.offsetWidth) {
									nCalcTmp.style.width = _fnStringToCss(nWrapper.offsetWidth);
								}
							} else if (oSettings.oScroll.sY !== "") {
								nCalcTmp.style.width = _fnStringToCss(nWrapper.offsetWidth);
							} else if (widthAttr) {
								nCalcTmp.style.width = _fnStringToCss(widthAttr);
							}
							nCalcTmp.style.visibility = "hidden";

							/* Scrolling considerations */
							_fnScrollingWidthAdjust(oSettings, nCalcTmp);

							var oNodes = $("tbody tr:eq(0)", nCalcTmp).children();
							if (oNodes.length === 0) {
								oNodes = _fnGetUniqueThs(oSettings, $('thead', nCalcTmp)[0]);
							}

							if (oSettings.oScroll.sX !== "") {
								var iTotal = 0;
								iCorrector = 0;
								for ( i = 0; i < oSettings.aoColumns.length; i++) {
									if (oSettings.aoColumns[i].bVisible) {
										if (oSettings.aoColumns[i].sWidthOrig === null) {
											iTotal += $(oNodes[iCorrector]).outerWidth();
										} else {
											iTotal += parseInt(oSettings.aoColumns[i].sWidth.replace('px', ''), 10) + ($(oNodes[iCorrector]).outerWidth() - $(oNodes[iCorrector]).width());
										}
										iCorrector++;
									}
								}

								nCalcTmp.style.width = _fnStringToCss(iTotal);
								oSettings.nTable.style.width = _fnStringToCss(iTotal);
							}

							iCorrector = 0;
							for ( i = 0; i < oSettings.aoColumns.length; i++) {
								if (oSettings.aoColumns[i].bVisible) {
									iWidth = $(oNodes[iCorrector]).width();
									if (iWidth !== null && iWidth > 0) {
										oSettings.aoColumns[i].sWidth = _fnStringToCss(iWidth);
									}
									iCorrector++;
								}
							}

							var cssWidth = $(nCalcTmp).css('width');
							oSettings.nTable.style.width = (cssWidth.indexOf('%') !== -1) ? cssWidth : _fnStringToCss($(nCalcTmp).outerWidth());
							nCalcTmp.parentNode.removeChild(nCalcTmp);
						}

						if (widthAttr) {
							oSettings.nTable.style.width = _fnStringToCss(widthAttr);
						}
					}

					function _fnScrollingWidthAdjust(oSettings, n) {
						if (oSettings.oScroll.sX === "" && oSettings.oScroll.sY !== "") {
							/* When y-scrolling only, we want to remove the width of the scroll bar so the table
							 * + scroll bar will fit into the area avaialble.
							 */
							var iOrigWidth = $(n).width();
							n.style.width = _fnStringToCss($(n).outerWidth() - oSettings.oScroll.iBarWidth);
						} else if (oSettings.oScroll.sX !== "") {
							/* When x-scrolling both ways, fix the table at it's current size, without adjusting */
							n.style.width = _fnStringToCss($(n).outerWidth());
						}
					}

					function _fnGetWidestNode(oSettings, iCol) {
						var iMaxIndex = _fnGetMaxLenString(oSettings, iCol);
						if (iMaxIndex < 0) {
							return null;
						}

						if (oSettings.aoData[iMaxIndex].nTr === null) {
							var n = document.createElement('td');
							n.innerHTML = _fnGetCellData(oSettings, iMaxIndex, iCol, '');
							return n;
						}
						return _fnGetTdNodes(oSettings, iMaxIndex)[iCol];
					}

					function _fnGetMaxLenString(oSettings, iCol) {
						var iMax = -1;
						var iMaxIndex = -1;

						for (var i = 0; i < oSettings.aoData.length; i++) {
							var s = _fnGetCellData(oSettings, i, iCol, 'display') + "";
							s = s.replace(/<.*?>/g, "");
							if (s.length > iMax) {
								iMax = s.length;
								iMaxIndex = i;
							}
						}

						return iMaxIndex;
					}

					function _fnStringToCss(s) {
						if (s === null) {
							return "0px";
						}

						if ( typeof s == 'number') {
							if (s < 0) {
								return "0px";
							}
							return s + "px";
						}

						/* Check if the last character is not 0-9 */
						var c = s.charCodeAt(s.length - 1);
						if (c < 0x30 || c > 0x39) {
							return s;
						}
						return s + "px";
					}

					function _fnScrollBarWidth() {
						var inner = document.createElement('p');
						var style = inner.style;
						style.width = "100%";
						style.height = "200px";
						style.padding = "0px";

						var outer = document.createElement('div');
						style = outer.style;
						style.position = "absolute";
						style.top = "0px";
						style.left = "0px";
						style.visibility = "hidden";
						style.width = "200px";
						style.height = "150px";
						style.padding = "0px";
						style.overflow = "hidden";
						outer.appendChild(inner);

						document.body.appendChild(outer);
						var w1 = inner.offsetWidth;
						outer.style.overflow = 'scroll';
						var w2 = inner.offsetWidth;
						if (w1 == w2) {
							w2 = outer.clientWidth;
						}

						document.body.removeChild(outer);
						return (w1 - w2);
					}

					function _fnSort(oSettings, bApplyClasses) {
						var i, iLen, j, jLen, k, kLen, sDataType, nTh, aaSort = [], aiOrig = [], oSort = DataTable.ext.oSort, aoData = oSettings.aoData, aoColumns = oSettings.aoColumns, oAria = oSettings.oLanguage.oAria;

						/* No sorting required if server-side or no sorting array */
						if (!oSettings.oFeatures.bServerSide && (oSettings.aaSorting.length !== 0 || oSettings.aaSortingFixed !== null)) {
							aaSort = (oSettings.aaSortingFixed !== null ) ? oSettings.aaSortingFixed.concat(oSettings.aaSorting) : oSettings.aaSorting.slice();

							for ( i = 0; i < aaSort.length; i++) {
								var iColumn = aaSort[i][0];
								var iVisColumn = _fnColumnIndexToVisible(oSettings, iColumn);
								sDataType = oSettings.aoColumns[iColumn].sSortDataType;
								if (DataTable.ext.afnSortData[sDataType]) {
									var aData = DataTable.ext.afnSortData[sDataType].call(oSettings.oInstance, oSettings, iColumn, iVisColumn);
									if (aData.length === aoData.length) {
										for ( j = 0, jLen = aoData.length; j < jLen; j++) {
											_fnSetCellData(oSettings, j, iColumn, aData[j]);
										}
									} else {
										_fnLog(oSettings, 0, "Returned data sort array (col " + iColumn + ") is the wrong length");
									}
								}
							}

							for ( i = 0, iLen = oSettings.aiDisplayMaster.length; i < iLen; i++) {
								aiOrig[oSettings.aiDisplayMaster[i]] = i;
							}

							var iSortLen = aaSort.length;
							var fnSortFormat, aDataSort;
							for ( i = 0, iLen = aoData.length; i < iLen; i++) {
								for ( j = 0; j < iSortLen; j++) {
									aDataSort = aoColumns[aaSort[j][0]].aDataSort;

									for ( k = 0, kLen = aDataSort.length; k < kLen; k++) {
										sDataType = aoColumns[aDataSort[k]].sType;
										fnSortFormat = oSort[( sDataType ? sDataType : 'string') + "-pre"];

										aoData[i]._aSortData[aDataSort[k]] = fnSortFormat ? fnSortFormat(_fnGetCellData(oSettings, i, aDataSort[k], 'sort')) : _fnGetCellData(oSettings, i, aDataSort[k], 'sort');
									}
								}
							}

							oSettings.aiDisplayMaster.sort(function(a, b) {
								var k, l, lLen, iTest, aDataSort, sDataType;
								for ( k = 0; k < iSortLen; k++) {
									aDataSort = aoColumns[aaSort[k][0]].aDataSort;

									for ( l = 0, lLen = aDataSort.length; l < lLen; l++) {
										sDataType = aoColumns[aDataSort[l]].sType;

										iTest = oSort[ (sDataType ? sDataType : 'string')+"-"+aaSort[k][1] ](aoData[a]._aSortData[aDataSort[l]], aoData[b]._aSortData[aDataSort[l]]);

										if (iTest !== 0) {
											return iTest;
										}
									}
								}

								return oSort['numeric-asc'](aiOrig[a], aiOrig[b]);
							});
						}

						/* Alter the sorting classes to take account of the changes */
						if ((bApplyClasses === undefined || bApplyClasses) && !oSettings.oFeatures.bDeferRender) {
							_fnSortingClasses(oSettings);
						}

						for ( i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
							var sTitle = aoColumns[i].sTitle.replace(/<.*?>/g, "");
							nTh = aoColumns[i].nTh;
							nTh.removeAttribute('aria-sort');
							nTh.removeAttribute('aria-label');

							/* In ARIA only the first sorting column can be marked as sorting - no multi-sort option */
							if (aoColumns[i].bSortable) {
								if (aaSort.length > 0 && aaSort[0][0] == i) {
									nTh.setAttribute('aria-sort', aaSort[0][1] == "asc" ? "ascending" : "descending");

									var nextSort = (aoColumns[i].asSorting[aaSort[0][2] + 1]) ? aoColumns[i].asSorting[aaSort[0][2] + 1] : aoColumns[i].asSorting[0];
									nTh.setAttribute('aria-label', sTitle + (nextSort == "asc" ? oAria.sSortAscending : oAria.sSortDescending));
								} else {
									nTh.setAttribute('aria-label', sTitle + (aoColumns[i].asSorting[0] == "asc" ? oAria.sSortAscending : oAria.sSortDescending));
								}
							} else {
								nTh.setAttribute('aria-label', sTitle);
							}
						}

						/* Tell the draw function that we have sorted the data */
						oSettings.bSorted = true;
						$(oSettings.oInstance).trigger('sort', oSettings);

						/* Copy the master data into the draw array and re-draw */
						if (oSettings.oFeatures.bFilter) {
							/* _fnFilter() will redraw the table for us */
							_fnFilterComplete(oSettings, oSettings.oPreviousSearch, 1);
						} else {
							oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
							oSettings._iDisplayStart = 0;
							/* reset display back to page 0 */
							_fnCalculateEnd(oSettings);
							_fnDraw(oSettings);
						}
					}

					function _fnSortAttachListener(oSettings, nNode, iDataIndex, fnCallback) {
						_fnBindAction(nNode, {}, function(e) {
							/* If the column is not sortable - don't to anything */
							if (oSettings.aoColumns[iDataIndex].bSortable === false) {
								return;
							}

							var fnInnerSorting = function() {
								var iColumn, iNextSort;

								/* If the shift key is pressed then we are multiple column sorting */
								if (e.shiftKey) {
									/* Are we already doing some kind of sort on this column? */
									var bFound = false;
									for (var i = 0; i < oSettings.aaSorting.length; i++) {
										if (oSettings.aaSorting[i][0] == iDataIndex) {
											bFound = true;
											iColumn = oSettings.aaSorting[i][0];
											iNextSort = oSettings.aaSorting[i][2] + 1;

											if (!oSettings.aoColumns[iColumn].asSorting[iNextSort]) {
												/* Reached the end of the sorting options, remove from multi-col sort */
												oSettings.aaSorting.splice(i, 1);
											} else {
												/* Move onto next sorting direction */
												oSettings.aaSorting[i][1] = oSettings.aoColumns[iColumn].asSorting[iNextSort];
												oSettings.aaSorting[i][2] = iNextSort;
											}
											break;
										}
									}

									/* No sort yet - add it in */
									if (bFound === false) {
										oSettings.aaSorting.push([iDataIndex, oSettings.aoColumns[iDataIndex].asSorting[0], 0]);
									}
								} else {
									/* If no shift key then single column sort */
									if (oSettings.aaSorting.length == 1 && oSettings.aaSorting[0][0] == iDataIndex) {
										iColumn = oSettings.aaSorting[0][0];
										iNextSort = oSettings.aaSorting[0][2] + 1;
										if (!oSettings.aoColumns[iColumn].asSorting[iNextSort]) {
											iNextSort = 0;
										}
										oSettings.aaSorting[0][1] = oSettings.aoColumns[iColumn].asSorting[iNextSort];
										oSettings.aaSorting[0][2] = iNextSort;
									} else {
										oSettings.aaSorting.splice(0, oSettings.aaSorting.length);
										oSettings.aaSorting.push([iDataIndex, oSettings.aoColumns[iDataIndex].asSorting[0], 0]);
									}
								}

								/* Run the sort */
								_fnSort(oSettings);
							};
							/* /fnInnerSorting */

							if (!oSettings.oFeatures.bProcessing) {
								fnInnerSorting();
							} else {
								_fnProcessingDisplay(oSettings, true);
								setTimeout(function() {
									fnInnerSorting();
									if (!oSettings.oFeatures.bServerSide) {
										_fnProcessingDisplay(oSettings, false);
									}
								}, 0);
							}

							/* Call the user specified callback function - used for async user interaction */
							if ( typeof fnCallback == 'function') {
								fnCallback(oSettings);
							}
						});
					}

					function _fnSortingClasses(oSettings) {
						var i, iLen, j, jLen, iFound;
						var aaSort, sClass;
						var iColumns = oSettings.aoColumns.length;
						var oClasses = oSettings.oClasses;

						for ( i = 0; i < iColumns; i++) {
							if (oSettings.aoColumns[i].bSortable) {
								$(oSettings.aoColumns[i].nTh).removeClass(oClasses.sSortAsc + " " + oClasses.sSortDesc + " " + oSettings.aoColumns[i].sSortingClass);
							}
						}

						if (oSettings.aaSortingFixed !== null) {
							aaSort = oSettings.aaSortingFixed.concat(oSettings.aaSorting);
						} else {
							aaSort = oSettings.aaSorting.slice();
						}

						/* Apply the required classes to the header */
						for ( i = 0; i < oSettings.aoColumns.length; i++) {
							if (oSettings.aoColumns[i].bSortable) {
								sClass = oSettings.aoColumns[i].sSortingClass;
								iFound = -1;
								for ( j = 0; j < aaSort.length; j++) {
									if (aaSort[j][0] == i) {
										sClass = (aaSort[j][1] == "asc" ) ? oClasses.sSortAsc : oClasses.sSortDesc;
										iFound = j;
										break;
									}
								}
								$(oSettings.aoColumns[i].nTh).addClass(sClass);

								if (oSettings.bJUI) {
									/* jQuery UI uses extra markup */
									var jqSpan = $("span." + oClasses.sSortIcon, oSettings.aoColumns[i].nTh);
									jqSpan.removeClass(oClasses.sSortJUIAsc + " " + oClasses.sSortJUIDesc + " " + oClasses.sSortJUI + " " + oClasses.sSortJUIAscAllowed + " " + oClasses.sSortJUIDescAllowed);

									var sSpanClass;
									if (iFound == -1) {
										sSpanClass = oSettings.aoColumns[i].sSortingClassJUI;
									} else if (aaSort[iFound][1] == "asc") {
										sSpanClass = oClasses.sSortJUIAsc;
									} else {
										sSpanClass = oClasses.sSortJUIDesc;
									}

									jqSpan.addClass(sSpanClass);
								}
							} else {
								$(oSettings.aoColumns[i].nTh).addClass(oSettings.aoColumns[i].sSortingClass);
							}
						}

						sClass = oClasses.sSortColumn;

						if (oSettings.oFeatures.bSort && oSettings.oFeatures.bSortClasses) {
							var nTds = _fnGetTdNodes(oSettings);

							/* Determine what the sorting class for each column should be */
							var iClass, iTargetCol;
							var asClasses = [];
							for ( i = 0; i < iColumns; i++) {
								asClasses.push("");
							}
							for ( i = 0, iClass = 1; i < aaSort.length; i++) {
								iTargetCol = parseInt(aaSort[i][0], 10);
								asClasses[iTargetCol] = sClass + iClass;

								if (iClass < 3) {
									iClass++;
								}
							}

							/* Make changes to the classes for each cell as needed */
							var reClass = new RegExp(sClass + "[123]");
							var sTmpClass, sCurrentClass, sNewClass;
							for ( i = 0, iLen = nTds.length; i < iLen; i++) {
								/* Determine which column we're looking at */
								iTargetCol = i % iColumns;

								/* What is the full list of classes now */
								sCurrentClass = nTds[i].className;
								/* What sorting class should be applied? */
								sNewClass = asClasses[iTargetCol];
								/* What would the new full list be if we did a replacement? */
								sTmpClass = sCurrentClass.replace(reClass, sNewClass);

								if (sTmpClass != sCurrentClass) {
									/* We changed something */
									nTds[i].className = $.trim(sTmpClass);
								} else if (sNewClass.length > 0 && sCurrentClass.indexOf(sNewClass) == -1) {
									/* We need to add a class */
									nTds[i].className = sCurrentClass + " " + sNewClass;
								}
							}
						}
					}

					function _fnSaveState(oSettings) {
						if (!oSettings.oFeatures.bStateSave || oSettings.bDestroying) {
							return;
						}

						/* Store the interesting variables */
						var i, iLen, bInfinite = oSettings.oScroll.bInfinite;
						var oState = {
							"iCreate" : new Date().getTime(),
							"iStart" : ( bInfinite ? 0 : oSettings._iDisplayStart),
							"iEnd" : ( bInfinite ? oSettings._iDisplayLength : oSettings._iDisplayEnd),
							"iLength" : oSettings._iDisplayLength,
							"aaSorting" : $.extend(true, [], oSettings.aaSorting),
							"oSearch" : $.extend(true, {}, oSettings.oPreviousSearch),
							"aoSearchCols" : $.extend(true, [], oSettings.aoPreSearchCols),
							"abVisCols" : []
						};

						for ( i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
							oState.abVisCols.push(oSettings.aoColumns[i].bVisible);
						}

						_fnCallbackFire(oSettings, "aoStateSaveParams", 'stateSaveParams', [oSettings, oState]);

						oSettings.fnStateSave.call(oSettings.oInstance, oSettings, oState);
					}

					function _fnLoadState(oSettings, oInit) {
						if (!oSettings.oFeatures.bStateSave) {
							return;
						}

						var oData = oSettings.fnStateLoad.call(oSettings.oInstance, oSettings);
						if (!oData) {
							return;
						}

						var abStateLoad = _fnCallbackFire(oSettings, 'aoStateLoadParams', 'stateLoadParams', [oSettings, oData]);
						if ($.inArray(false, abStateLoad) !== -1) {
							return;
						}

						/* Store the saved state so it might be accessed at any time */
						oSettings.oLoadedState = $.extend(true, {}, oData);

						/* Restore key features */
						oSettings._iDisplayStart = oData.iStart;
						oSettings.iInitDisplayStart = oData.iStart;
						oSettings._iDisplayEnd = oData.iEnd;
						oSettings._iDisplayLength = oData.iLength;
						oSettings.aaSorting = oData.aaSorting.slice();
						oSettings.saved_aaSorting = oData.aaSorting.slice();

						/* Search filtering  */
						$.extend(oSettings.oPreviousSearch, oData.oSearch);
						$.extend(true, oSettings.aoPreSearchCols, oData.aoSearchCols);

						oInit.saved_aoColumns = [];
						for (var i = 0; i < oData.abVisCols.length; i++) {
							oInit.saved_aoColumns[i] = {};
							oInit.saved_aoColumns[i].bVisible = oData.abVisCols[i];
						}

						_fnCallbackFire(oSettings, 'aoStateLoaded', 'stateLoaded', [oSettings, oData]);
					}

					function _fnCreateCookie(sName, sValue, iSecs, sBaseName, fnCallback) {
						var date = new Date();
						date.setTime(date.getTime() + (iSecs * 1000));

						var aParts = window.location.pathname.split('/');
						var sNameFile = sName + '_' + aParts.pop().replace(/[\/:]/g, "").toLowerCase();
						var sFullCookie, oData;

						if (fnCallback !== null) {
							oData = ( typeof $.parseJSON === 'function') ? $.parseJSON(sValue) : eval('(' + sValue + ')');
							sFullCookie = fnCallback(sNameFile, oData, date.toGMTString(), aParts.join('/') + "/");
						} else {
							sFullCookie = sNameFile + "=" + encodeURIComponent(sValue) + "; expires=" + date.toGMTString() + "; path=" + aParts.join('/') + "/";
						}

						var aCookies = document.cookie.split(';'), iNewCookieLen = sFullCookie.split(';')[0].length, aOldCookies = [];

						if (iNewCookieLen + document.cookie.length + 10 > 4096)/* Magic 10 for padding */
						{
							for (var i = 0, iLen = aCookies.length; i < iLen; i++) {
								if (aCookies[i].indexOf(sBaseName) != -1) {
									/* It's a DataTables cookie, so eval it and check the time stamp */
									var aSplitCookie = aCookies[i].split('=');
									try {
										oData = eval('(' + decodeURIComponent(aSplitCookie[1]) + ')');

										if (oData && oData.iCreate) {
											aOldCookies.push({
												"name" : aSplitCookie[0],
												"time" : oData.iCreate
											});
										}
									} catch( e ) {
									}
								}
							}

							// Make sure we delete the oldest ones first
							aOldCookies.sort(function(a, b) {
								return b.time - a.time;
							});

							// Eliminate as many old DataTables cookies as we need to
							while (iNewCookieLen + document.cookie.length + 10 > 4096) {
								if (aOldCookies.length === 0) {
									// Deleted all DT cookies and still not enough space. Can't state save
									return;
								}

								var old = aOldCookies.pop();
								document.cookie = old.name + "=; expires=Thu, 01-Jan-1970 00:00:01 GMT; path=" + aParts.join('/') + "/";
							}
						}

						document.cookie = sFullCookie;
					}

					function _fnReadCookie(sName) {
						var aParts = window.location.pathname.split('/'), sNameEQ = sName + '_' + aParts[aParts.length - 1].replace(/[\/:]/g, "").toLowerCase() + '=', sCookieContents = document.cookie.split(';');

						for (var i = 0; i < sCookieContents.length; i++) {
							var c = sCookieContents[i];

							while (c.charAt(0) == ' ') {
								c = c.substring(1, c.length);
							}

							if (c.indexOf(sNameEQ) === 0) {
								return decodeURIComponent(c.substring(sNameEQ.length, c.length));
							}
						}
						return null;
					}

					function _fnSettingsFromNode(nTable) {
						for (var i = 0; i < DataTable.settings.length; i++) {
							if (DataTable.settings[i].nTable === nTable) {
								return DataTable.settings[i];
							}
						}

						return null;
					}

					function _fnGetTrNodes(oSettings) {
						var aNodes = [];
						var aoData = oSettings.aoData;
						for (var i = 0, iLen = aoData.length; i < iLen; i++) {
							if (aoData[i].nTr !== null) {
								aNodes.push(aoData[i].nTr);
							}
						}
						return aNodes;
					}

					function _fnGetTdNodes(oSettings, iIndividualRow) {
						var anReturn = [];
						var iCorrector;
						var anTds, nTd;
						var iRow, iRows = oSettings.aoData.length, iColumn, iColumns, oData, sNodeName, iStart = 0, iEnd = iRows;

						/* Allow the collection to be limited to just one row */
						if (iIndividualRow !== undefined) {
							iStart = iIndividualRow;
							iEnd = iIndividualRow + 1;
						}

						for ( iRow = iStart; iRow < iEnd; iRow++) {
							oData = oSettings.aoData[iRow];
							if (oData.nTr !== null) {
								/* get the TD child nodes - taking into account text etc nodes */
								anTds = [];
								nTd = oData.nTr.firstChild;
								while (nTd) {
									sNodeName = nTd.nodeName.toLowerCase();
									if (sNodeName == 'td' || sNodeName == 'th') {
										anTds.push(nTd);
									}
									nTd = nTd.nextSibling;
								}

								iCorrector = 0;
								for ( iColumn = 0, iColumns = oSettings.aoColumns.length; iColumn < iColumns; iColumn++) {
									if (oSettings.aoColumns[iColumn].bVisible) {
										anReturn.push(anTds[iColumn - iCorrector]);
									} else {
										anReturn.push(oData._anHidden[iColumn]);
										iCorrector++;
									}
								}
							}
						}

						return anReturn;
					}

					function _fnLog(oSettings, iLevel, sMesg) {
						var sAlert = (oSettings === null) ? "DataTables warning: " + sMesg : "DataTables warning (table id = '" + oSettings.sTableId + "'): " + sMesg;

						if (iLevel === 0) {
							if (DataTable.ext.sErrMode == 'alert') {
								alert(sAlert);
							} else {
								throw new Error(sAlert);
							}
							return;
						} else if (window.console && console.log) {
							console.log(sAlert);
						}
					}

					function _fnMap(oRet, oSrc, sName, sMappedName) {
						if (sMappedName === undefined) {
							sMappedName = sName;
						}
						if (oSrc[sName] !== undefined) {
							oRet[sMappedName] = oSrc[sName];
						}
					}

					function _fnExtend(oOut, oExtender) {
						var val;

						for (var prop in oExtender ) {
							if (oExtender.hasOwnProperty(prop)) {
								val = oExtender[prop];

								if ( typeof oInit[prop] === 'object' && val !== null && $.isArray(val) === false) {
									$.extend(true, oOut[prop], val);
								} else {
									oOut[prop] = val;
								}
							}
						}

						return oOut;
					}

					function _fnBindAction(n, oData, fn) {
						$(n).bind('click.DT', oData, function(e) {
							n.blur();
							// Remove focus outline for mouse users
							fn(e);
						}).bind('keypress.DT', oData, function(e) {
							if (e.which === 13) {
								fn(e);
							}
						}).bind('selectstart.DT', function() {
							/* Take the brutal approach to cancelling text selection */
							return false;
						});
					}

					function _fnCallbackReg(oSettings, sStore, fn, sName) {
						if (fn) {
							oSettings[sStore].push({
								"fn" : fn,
								"sName" : sName
							});
						}
					}

					function _fnCallbackFire(oSettings, sStore, sTrigger, aArgs) {
						var aoStore = oSettings[sStore];
						var aRet = [];

						for (var i = aoStore.length - 1; i >= 0; i--) {
							aRet.push(aoStore[i].fn.apply(oSettings.oInstance, aArgs));
						}

						if (sTrigger !== null) {
							$(oSettings.oInstance).trigger(sTrigger, aArgs);
						}

						return aRet;
					}

					var _fnJsonString = (window.JSON) ? JSON.stringify : function(o) {
						/* Not an object or array */
						var sType = typeof o;
						if (sType !== "object" || o === null) {
							// simple data type
							if (sType === "string") {
								o = '"' + o + '"';
							}
							return o + "";
						}

						/* If object or array, need to recurse over it */
						var sProp, mValue, json = [], bArr = $.isArray(o);

						for (sProp in o) {
							mValue = o[sProp];
							sType = typeof mValue;

							if (sType === "string") {
								mValue = '"' + mValue + '"';
							} else if (sType === "object" && mValue !== null) {
								mValue = _fnJsonString(mValue);
							}

							json.push(( bArr ? "" : '"' + sProp + '":') + mValue);
						}

						return ( bArr ? "[" : "{") + json + ( bArr ? "]" : "}");
					};

					function _fnBrowserDetect(oSettings) {
						
						var n = $(
						'<div style="position:absolute; top:0; left:0; height:1px; width:1px; overflow:hidden">'+
						'<div style="position:absolute; top:1px; left:1px; width:100px; overflow:scroll;">'+
						'<div id="DT_BrowserTest" style="width:100%; height:10px;"></div>'+
						'</div>'+
						'</div>')[0];

						document.body.appendChild(n);
						oSettings.oBrowser.bScrollOversize = $('#DT_BrowserTest', n)[0].offsetWidth === 100 ? true : false;
						document.body.removeChild(n);
					}

					this.$ = function(sSelector, oOpts) {
						var i, iLen, a = [], tr;
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						var aoData = oSettings.aoData;
						var aiDisplay = oSettings.aiDisplay;
						var aiDisplayMaster = oSettings.aiDisplayMaster;

						if (!oOpts) {
							oOpts = {};
						}

						oOpts = $.extend({}, {
							"filter" : "none", // applied
							"order" : "current", // "original"
							"page" : "all" // current
						}, oOpts);

						// Current page implies that order=current and fitler=applied, since it is fairly
						// senseless otherwise
						if (oOpts.page == 'current') {
							for ( i = oSettings._iDisplayStart, iLen = oSettings.fnDisplayEnd(); i < iLen; i++) {
								tr = aoData[aiDisplay[i]].nTr;
								if (tr) {
									a.push(tr);
								}
							}
						} else if (oOpts.order == "current" && oOpts.filter == "none") {
							for ( i = 0, iLen = aiDisplayMaster.length; i < iLen; i++) {
								tr = aoData[aiDisplayMaster[i]].nTr;
								if (tr) {
									a.push(tr);
								}
							}
						} else if (oOpts.order == "current" && oOpts.filter == "applied") {
							for ( i = 0, iLen = aiDisplay.length; i < iLen; i++) {
								tr = aoData[aiDisplay[i]].nTr;
								if (tr) {
									a.push(tr);
								}
							}
						} else if (oOpts.order == "original" && oOpts.filter == "none") {
							for ( i = 0, iLen = aoData.length; i < iLen; i++) {
								tr = aoData[i].nTr;
								if (tr) {
									a.push(tr);
								}
							}
						} else if (oOpts.order == "original" && oOpts.filter == "applied") {
							for ( i = 0, iLen = aoData.length; i < iLen; i++) {
								tr = aoData[i].nTr;
								if ($.inArray(i, aiDisplay) !== -1 && tr) {
									a.push(tr);
								}
							}
						} else {
							_fnLog(oSettings, 1, "Unknown selection options");
						}

						var jqA = $(a);
						var jqTRs = jqA.filter(sSelector);
						var jqDescendants = jqA.find(sSelector);

						return $([].concat($.makeArray(jqTRs), $.makeArray(jqDescendants)));
					};

					this._ = function(sSelector, oOpts) {
						var aOut = [];
						var i, iLen, iIndex;
						var aTrs = this.$(sSelector, oOpts);

						for ( i = 0, iLen = aTrs.length; i < iLen; i++) {
							aOut.push(this.fnGetData(aTrs[i]));
						}

						return aOut;
					};

					this.fnAddData = function(mData, bRedraw) {
						if (mData.length === 0) {
							return [];
						}

						var aiReturn = [];
						var iTest;

						/* Find settings from table node */
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);

						/* Check if we want to add multiple rows or not */
						if ( typeof mData[0] === "object" && mData[0] !== null) {
							for (var i = 0; i < mData.length; i++) {
								iTest = _fnAddData(oSettings, mData[i]);
								if (iTest == -1) {
									return aiReturn;
								}
								aiReturn.push(iTest);
							}
						} else {
							iTest = _fnAddData(oSettings, mData);
							if (iTest == -1) {
								return aiReturn;
							}
							aiReturn.push(iTest);
						}

						oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();

						if (bRedraw === undefined || bRedraw) {
							_fnReDraw(oSettings);
						}
						return aiReturn;
					};

					this.fnAdjustColumnSizing = function(bRedraw) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						_fnAdjustColumnSizing(oSettings);

						if (bRedraw === undefined || bRedraw) {
							this.fnDraw(false);
						} else if (oSettings.oScroll.sX !== "" || oSettings.oScroll.sY !== "") {
							/* If not redrawing, but scrolling, we want to apply the new column sizes anyway */
							this.oApi._fnScrollDraw(oSettings);
						}
					};

					this.fnClearTable = function(bRedraw) {
						/* Find settings from table node */
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						_fnClearTable(oSettings);

						if (bRedraw === undefined || bRedraw) {
							_fnDraw(oSettings);
						}
					};

					this.fnClose = function(nTr) {
						/* Find settings from table node */
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);

						for (var i = 0; i < oSettings.aoOpenRows.length; i++) {
							if (oSettings.aoOpenRows[i].nParent == nTr) {
								var nTrParent = oSettings.aoOpenRows[i].nTr.parentNode;
								if (nTrParent) {
									/* Remove it if it is currently on display */
									nTrParent.removeChild(oSettings.aoOpenRows[i].nTr);
								}
								oSettings.aoOpenRows.splice(i, 1);
								return 0;
							}
						}
						return 1;
					};

					this.fnDeleteRow = function(mTarget, fnCallBack, bRedraw) {
						/* Find settings from table node */
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						var i, iLen, iAODataIndex;

						iAODataIndex = ( typeof mTarget === 'object') ? _fnNodeToDataIndex(oSettings, mTarget) : mTarget;

						/* Return the data array from this row */
						var oData = oSettings.aoData.splice(iAODataIndex, 1);

						/* Update the _DT_RowIndex parameter */
						for ( i = 0, iLen = oSettings.aoData.length; i < iLen; i++) {
							if (oSettings.aoData[i].nTr !== null) {
								oSettings.aoData[i].nTr._DT_RowIndex = i;
							}
						}

						/* Remove the target row from the search array */
						var iDisplayIndex = $.inArray(iAODataIndex, oSettings.aiDisplay);
						oSettings.asDataSearch.splice(iDisplayIndex, 1);

						/* Delete from the display arrays */
						_fnDeleteIndex(oSettings.aiDisplayMaster, iAODataIndex);
						_fnDeleteIndex(oSettings.aiDisplay, iAODataIndex);

						/* If there is a user callback function - call it */
						if ( typeof fnCallBack === "function") {
							fnCallBack.call(this, oSettings, oData);
						}

						/* Check for an 'overflow' they case for displaying the table */
						if (oSettings._iDisplayStart >= oSettings.fnRecordsDisplay()) {
							oSettings._iDisplayStart -= oSettings._iDisplayLength;
							if (oSettings._iDisplayStart < 0) {
								oSettings._iDisplayStart = 0;
							}
						}

						if (bRedraw === undefined || bRedraw) {
							_fnCalculateEnd(oSettings);
							_fnDraw(oSettings);
						}

						return oData;
					};

					this.fnDestroy = function(bRemove) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						var nOrig = oSettings.nTableWrapper.parentNode;
						var nBody = oSettings.nTBody;
						var i, iLen;

						bRemove = (bRemove === undefined) ? false : bRemove;

						/* Flag to note that the table is currently being destroyed - no action should be taken */
						oSettings.bDestroying = true;

						/* Fire off the destroy callbacks for plug-ins etc */
						_fnCallbackFire(oSettings, "aoDestroyCallback", "destroy", [oSettings]);

						/* If the table is not being removed, restore the hidden columns */
						if (!bRemove) {
							for ( i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
								if (oSettings.aoColumns[i].bVisible === false) {
									this.fnSetColumnVis(i, true);
								}
							}
						}

						/* Blitz all DT events */
						$(oSettings.nTableWrapper).find('*').andSelf().unbind('.DT');

						/* If there is an 'empty' indicator row, remove it */
						$('tbody>tr>td.' + oSettings.oClasses.sRowEmpty, oSettings.nTable).parent().remove();

						/* When scrolling we had to break the table up - restore it */
						if (oSettings.nTable != oSettings.nTHead.parentNode) {
							$(oSettings.nTable).children('thead').remove();
							oSettings.nTable.appendChild(oSettings.nTHead);
						}

						if (oSettings.nTFoot && oSettings.nTable != oSettings.nTFoot.parentNode) {
							$(oSettings.nTable).children('tfoot').remove();
							oSettings.nTable.appendChild(oSettings.nTFoot);
						}

						/* Remove the DataTables generated nodes, events and classes */
						oSettings.nTable.parentNode.removeChild(oSettings.nTable);
						$(oSettings.nTableWrapper).remove();

						oSettings.aaSorting = [];
						oSettings.aaSortingFixed = [];
						_fnSortingClasses(oSettings);

						$(_fnGetTrNodes(oSettings)).removeClass(oSettings.asStripeClasses.join(' '));

						$('th, td', oSettings.nTHead).removeClass([oSettings.oClasses.sSortable, oSettings.oClasses.sSortableAsc, oSettings.oClasses.sSortableDesc, oSettings.oClasses.sSortableNone].join(' '));
						if (oSettings.bJUI) {
							$('th span.' + oSettings.oClasses.sSortIcon + ', td span.' + oSettings.oClasses.sSortIcon, oSettings.nTHead).remove();

							$('th, td', oSettings.nTHead).each(function() {
								var jqWrapper = $('div.' + oSettings.oClasses.sSortJUIWrapper, this);
								var kids = jqWrapper.contents();
								$(this).append(kids);
								jqWrapper.remove();
							});
						}

						/* Add the TR elements back into the table in their original order */
						if (!bRemove && oSettings.nTableReinsertBefore) {
							nOrig.insertBefore(oSettings.nTable, oSettings.nTableReinsertBefore);
						} else if (!bRemove) {
							nOrig.appendChild(oSettings.nTable);
						}

						for ( i = 0, iLen = oSettings.aoData.length; i < iLen; i++) {
							if (oSettings.aoData[i].nTr !== null) {
								nBody.appendChild(oSettings.aoData[i].nTr);
							}
						}

						/* Restore the width of the original table */
						if (oSettings.oFeatures.bAutoWidth === true) {
							oSettings.nTable.style.width = _fnStringToCss(oSettings.sDestroyWidth);
						}

						iLen = oSettings.asDestroyStripes.length;
						if (iLen) {
							var anRows = $(nBody).children('tr');
							for ( i = 0; i < iLen; i++) {
								anRows.filter(':nth-child(' + iLen + 'n + ' + i + ')').addClass(oSettings.asDestroyStripes[i]);
							}
						}

						/* Remove the settings object from the settings array */
						for ( i = 0, iLen = DataTable.settings.length; i < iLen; i++) {
							if (DataTable.settings[i] == oSettings) {
								DataTable.settings.splice(i, 1);
							}
						}

						/* End it all */
						oSettings = null;
						oInit = null;
					};

					this.fnDraw = function(bComplete) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						if (bComplete === false) {
							_fnCalculateEnd(oSettings);
							_fnDraw(oSettings);
						} else {
							_fnReDraw(oSettings);
						}
					};

					this.fnFilter = function(sInput, iColumn, bRegex, bSmart, bShowGlobal, bCaseInsensitive) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);

						if (!oSettings.oFeatures.bFilter) {
							return;
						}

						if (bRegex === undefined || bRegex === null) {
							bRegex = false;
						}

						if (bSmart === undefined || bSmart === null) {
							bSmart = true;
						}

						if (bShowGlobal === undefined || bShowGlobal === null) {
							bShowGlobal = true;
						}

						if (bCaseInsensitive === undefined || bCaseInsensitive === null) {
							bCaseInsensitive = true;
						}

						if (iColumn === undefined || iColumn === null) {
							/* Global filter */
							_fnFilterComplete(oSettings, {
								"sSearch" : sInput + "",
								"bRegex" : bRegex,
								"bSmart" : bSmart,
								"bCaseInsensitive" : bCaseInsensitive
							}, 1);

							if (bShowGlobal && oSettings.aanFeatures.f) {
								var n = oSettings.aanFeatures.f;
								for (var i = 0, iLen = n.length; i < iLen; i++) {
									// IE9 throws an 'unknown error' if document.activeElement is used
									// inside an iframe or frame...
									try {
										if (n[i]._DT_Input != document.activeElement) {
											$(n[i]._DT_Input).val(sInput);
										}
									} catch ( e ) {
										$(n[i]._DT_Input).val(sInput);
									}
								}
							}
						} else {
							/* Single column filter */
							$.extend(oSettings.aoPreSearchCols[iColumn], {
								"sSearch" : sInput + "",
								"bRegex" : bRegex,
								"bSmart" : bSmart,
								"bCaseInsensitive" : bCaseInsensitive
							});
							_fnFilterComplete(oSettings, oSettings.oPreviousSearch, 1);
						}
					};

					this.fnGetData = function(mRow, iCol) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);

						if (mRow !== undefined) {
							var iRow = mRow;
							if ( typeof mRow === 'object') {
								var sNode = mRow.nodeName.toLowerCase();
								if (sNode === "tr") {
									iRow = _fnNodeToDataIndex(oSettings, mRow);
								} else if (sNode === "td") {
									iRow = _fnNodeToDataIndex(oSettings, mRow.parentNode);
									iCol = _fnNodeToColumnIndex(oSettings, iRow, mRow);
								}
							}

							if (iCol !== undefined) {
								return _fnGetCellData(oSettings, iRow, iCol, '');
							}
							return (oSettings.aoData[iRow] !== undefined) ? oSettings.aoData[iRow]._aData : null;
						}
						return _fnGetDataMaster(oSettings);
					};

					this.fnGetNodes = function(iRow) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);

						if (iRow !== undefined) {
							return (oSettings.aoData[iRow] !== undefined) ? oSettings.aoData[iRow].nTr : null;
						}
						return _fnGetTrNodes(oSettings);
					};

					this.fnGetPosition = function(nNode) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						var sNodeName = nNode.nodeName.toUpperCase();

						if (sNodeName == "TR") {
							return _fnNodeToDataIndex(oSettings, nNode);
						} else if (sNodeName == "TD" || sNodeName == "TH") {
							var iDataIndex = _fnNodeToDataIndex(oSettings, nNode.parentNode);
							var iColumnIndex = _fnNodeToColumnIndex(oSettings, iDataIndex, nNode);
							return [iDataIndex, _fnColumnIndexToVisible(oSettings, iColumnIndex), iColumnIndex];
						}
						return null;
					};

					this.fnIsOpen = function(nTr) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						var aoOpenRows = oSettings.aoOpenRows;

						for (var i = 0; i < oSettings.aoOpenRows.length; i++) {
							if (oSettings.aoOpenRows[i].nParent == nTr) {
								return true;
							}
						}
						return false;
					};

					this.fnOpen = function(nTr, mHtml, sClass) {
						/* Find settings from table node */
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);

						/* Check that the row given is in the table */
						var nTableRows = _fnGetTrNodes(oSettings);
						if ($.inArray(nTr, nTableRows) === -1) {
							return;
						}

						/* the old open one if there is one */
						this.fnClose(nTr);

						var nNewRow = document.createElement("tr");
						var nNewCell = document.createElement("td");
						nNewRow.appendChild(nNewCell);
						nNewCell.className = sClass;
						nNewCell.colSpan = _fnVisbleColumns(oSettings);

						if ( typeof mHtml === "string") {
							nNewCell.innerHTML = mHtml;
						} else {
							$(nNewCell).html(mHtml);
						}

						/* If the nTr isn't on the page at the moment - then we don't insert at the moment */
						var nTrs = $('tr', oSettings.nTBody);
						if ($.inArray(nTr, nTrs) != -1) {
							$(nNewRow).insertAfter(nTr);
						}

						oSettings.aoOpenRows.push({
							"nTr" : nNewRow,
							"nParent" : nTr
						});

						return nNewRow;
					};

					this.fnPageChange = function(mAction, bRedraw) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						_fnPageChange(oSettings, mAction);
						_fnCalculateEnd(oSettings);

						if (bRedraw === undefined || bRedraw) {
							_fnDraw(oSettings);
						}
					};

					this.fnSetColumnVis = function(iCol, bShow, bRedraw) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						var i, iLen;
						var aoColumns = oSettings.aoColumns;
						var aoData = oSettings.aoData;
						var nTd, bAppend, iBefore;

						/* No point in doing anything if we are requesting what is already true */
						if (aoColumns[iCol].bVisible == bShow) {
							return;
						}

						/* Show the column */
						if (bShow) {
							var iInsert = 0;
							for ( i = 0; i < iCol; i++) {
								if (aoColumns[i].bVisible) {
									iInsert++;
								}
							}

							/* Need to decide if we should use appendChild or insertBefore */
							bAppend = (iInsert >= _fnVisbleColumns(oSettings));

							/* Which coloumn should we be inserting before? */
							if (!bAppend) {
								for ( i = iCol; i < aoColumns.length; i++) {
									if (aoColumns[i].bVisible) {
										iBefore = i;
										break;
									}
								}
							}

							for ( i = 0, iLen = aoData.length; i < iLen; i++) {
								if (aoData[i].nTr !== null) {
									if (bAppend) {
										aoData[i].nTr.appendChild(aoData[i]._anHidden[iCol]);
									} else {
										aoData[i].nTr.insertBefore(aoData[i]._anHidden[iCol], _fnGetTdNodes( oSettings, i )[iBefore]);
									}
								}
							}
						} else {
							/* Remove a column from display */
							for ( i = 0, iLen = aoData.length; i < iLen; i++) {
								if (aoData[i].nTr !== null) {
									nTd = _fnGetTdNodes( oSettings, i )[iCol];
									aoData[i]._anHidden[iCol] = nTd;
									nTd.parentNode.removeChild(nTd);
								}
							}
						}

						/* Clear to set the visible flag */
						aoColumns[iCol].bVisible = bShow;

						/* Redraw the header and footer based on the new column visibility */
						_fnDrawHead(oSettings, oSettings.aoHeader);
						if (oSettings.nTFoot) {
							_fnDrawHead(oSettings, oSettings.aoFooter);
						}

						/* If there are any 'open' rows, then we need to alter the colspan for this col change */
						for ( i = 0, iLen = oSettings.aoOpenRows.length; i < iLen; i++) {
							oSettings.aoOpenRows[i].nTr.colSpan = _fnVisbleColumns(oSettings);
						}

						if (bRedraw === undefined || bRedraw) {
							_fnAdjustColumnSizing(oSettings);
							_fnDraw(oSettings);
						}

						_fnSaveState(oSettings);
					};

					this.fnSettings = function() {
						return _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
					};

					this.fnSort = function(aaSort) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						oSettings.aaSorting = aaSort;
						_fnSort(oSettings);
					};

					this.fnSortListener = function(nNode, iColumn, fnCallback) {
						_fnSortAttachListener(_fnSettingsFromNode(this[DataTable.ext.iApiIndex]), nNode, iColumn, fnCallback);
					};

					this.fnUpdate = function(mData, mRow, iColumn, bRedraw, bAction) {
						var oSettings = _fnSettingsFromNode(this[DataTable.ext.iApiIndex]);
						var i, iLen, sDisplay;
						var iRow = ( typeof mRow === 'object') ? _fnNodeToDataIndex(oSettings, mRow) : mRow;

						if ($.isArray(mData) && iColumn === undefined) {
							/* Array update - update the whole row */
							oSettings.aoData[iRow]._aData = mData.slice();

							/* Flag to the function that we are recursing */
							for ( i = 0; i < oSettings.aoColumns.length; i++) {
								this.fnUpdate(_fnGetCellData(oSettings, iRow, i), iRow, i, false, false);
							}
						} else if ($.isPlainObject(mData) && iColumn === undefined) {
							/* Object update - update the whole row - assume the developer gets the object right */
							oSettings.aoData[iRow]._aData = $.extend(true, {}, mData);

							for ( i = 0; i < oSettings.aoColumns.length; i++) {
								this.fnUpdate(_fnGetCellData(oSettings, iRow, i), iRow, i, false, false);
							}
						} else {
							/* Individual cell update */
							_fnSetCellData(oSettings, iRow, iColumn, mData);
							sDisplay = _fnGetCellData(oSettings, iRow, iColumn, 'display');

							var oCol = oSettings.aoColumns[iColumn];
							if (oCol.fnRender !== null) {
								sDisplay = _fnRender(oSettings, iRow, iColumn);
								if (oCol.bUseRendered) {
									_fnSetCellData(oSettings, iRow, iColumn, sDisplay);
								}
							}

							if (oSettings.aoData[iRow].nTr !== null) {
								/* Do the actual HTML update */
								_fnGetTdNodes( oSettings, iRow )[iColumn].innerHTML = sDisplay;
							}
						}

						var iDisplayIndex = $.inArray(iRow, oSettings.aiDisplay);
						oSettings.asDataSearch[iDisplayIndex] = _fnBuildSearchRow(oSettings, _fnGetRowData(oSettings, iRow, 'filter', _fnGetColumns(oSettings, 'bSearchable')));

						/* Perform pre-draw actions */
						if (bAction === undefined || bAction) {
							_fnAdjustColumnSizing(oSettings);
						}

						/* Redraw the table */
						if (bRedraw === undefined || bRedraw) {
							_fnReDraw(oSettings);
						}
						return 0;
					};

					this.fnVersionCheck = DataTable.ext.fnVersionCheck;

					function _fnExternApiFunc(sFunc) {
						return function() {
							var aArgs = [_fnSettingsFromNode(this[DataTable.ext.iApiIndex])].concat(Array.prototype.slice.call(arguments));
							return DataTable.ext.oApi[sFunc].apply(this, aArgs);
						};
					}

					this.oApi = {
						"_fnExternApiFunc" : _fnExternApiFunc,
						"_fnInitialise" : _fnInitialise,
						"_fnInitComplete" : _fnInitComplete,
						"_fnLanguageCompat" : _fnLanguageCompat,
						"_fnAddColumn" : _fnAddColumn,
						"_fnColumnOptions" : _fnColumnOptions,
						"_fnAddData" : _fnAddData,
						"_fnCreateTr" : _fnCreateTr,
						"_fnGatherData" : _fnGatherData,
						"_fnBuildHead" : _fnBuildHead,
						"_fnDrawHead" : _fnDrawHead,
						"_fnDraw" : _fnDraw,
						"_fnReDraw" : _fnReDraw,
						"_fnAjaxUpdate" : _fnAjaxUpdate,
						"_fnAjaxParameters" : _fnAjaxParameters,
						"_fnAjaxUpdateDraw" : _fnAjaxUpdateDraw,
						"_fnServerParams" : _fnServerParams,
						"_fnAddOptionsHtml" : _fnAddOptionsHtml,
						"_fnFeatureHtmlTable" : _fnFeatureHtmlTable,
						"_fnScrollDraw" : _fnScrollDraw,
						"_fnAdjustColumnSizing" : _fnAdjustColumnSizing,
						"_fnFeatureHtmlFilter" : _fnFeatureHtmlFilter,
						"_fnFilterComplete" : _fnFilterComplete,
						"_fnFilterCustom" : _fnFilterCustom,
						"_fnFilterColumn" : _fnFilterColumn,
						"_fnFilter" : _fnFilter,
						"_fnBuildSearchArray" : _fnBuildSearchArray,
						"_fnBuildSearchRow" : _fnBuildSearchRow,
						"_fnFilterCreateSearch" : _fnFilterCreateSearch,
						"_fnDataToSearch" : _fnDataToSearch,
						"_fnSort" : _fnSort,
						"_fnSortAttachListener" : _fnSortAttachListener,
						"_fnSortingClasses" : _fnSortingClasses,
						"_fnFeatureHtmlPaginate" : _fnFeatureHtmlPaginate,
						"_fnPageChange" : _fnPageChange,
						"_fnFeatureHtmlInfo" : _fnFeatureHtmlInfo,
						"_fnUpdateInfo" : _fnUpdateInfo,
						"_fnFeatureHtmlLength" : _fnFeatureHtmlLength,
						"_fnFeatureHtmlProcessing" : _fnFeatureHtmlProcessing,
						"_fnProcessingDisplay" : _fnProcessingDisplay,
						"_fnVisibleToColumnIndex" : _fnVisibleToColumnIndex,
						"_fnColumnIndexToVisible" : _fnColumnIndexToVisible,
						"_fnNodeToDataIndex" : _fnNodeToDataIndex,
						"_fnVisbleColumns" : _fnVisbleColumns,
						"_fnCalculateEnd" : _fnCalculateEnd,
						"_fnConvertToWidth" : _fnConvertToWidth,
						"_fnCalculateColumnWidths" : _fnCalculateColumnWidths,
						"_fnScrollingWidthAdjust" : _fnScrollingWidthAdjust,
						"_fnGetWidestNode" : _fnGetWidestNode,
						"_fnGetMaxLenString" : _fnGetMaxLenString,
						"_fnStringToCss" : _fnStringToCss,
						"_fnDetectType" : _fnDetectType,
						"_fnSettingsFromNode" : _fnSettingsFromNode,
						"_fnGetDataMaster" : _fnGetDataMaster,
						"_fnGetTrNodes" : _fnGetTrNodes,
						"_fnGetTdNodes" : _fnGetTdNodes,
						"_fnEscapeRegex" : _fnEscapeRegex,
						"_fnDeleteIndex" : _fnDeleteIndex,
						"_fnReOrderIndex" : _fnReOrderIndex,
						"_fnColumnOrdering" : _fnColumnOrdering,
						"_fnLog" : _fnLog,
						"_fnClearTable" : _fnClearTable,
						"_fnSaveState" : _fnSaveState,
						"_fnLoadState" : _fnLoadState,
						"_fnCreateCookie" : _fnCreateCookie,
						"_fnReadCookie" : _fnReadCookie,
						"_fnDetectHeader" : _fnDetectHeader,
						"_fnGetUniqueThs" : _fnGetUniqueThs,
						"_fnScrollBarWidth" : _fnScrollBarWidth,
						"_fnApplyToChildren" : _fnApplyToChildren,
						"_fnMap" : _fnMap,
						"_fnGetRowData" : _fnGetRowData,
						"_fnGetCellData" : _fnGetCellData,
						"_fnSetCellData" : _fnSetCellData,
						"_fnGetObjectDataFn" : _fnGetObjectDataFn,
						"_fnSetObjectDataFn" : _fnSetObjectDataFn,
						"_fnApplyColumnDefs" : _fnApplyColumnDefs,
						"_fnBindAction" : _fnBindAction,
						"_fnExtend" : _fnExtend,
						"_fnCallbackReg" : _fnCallbackReg,
						"_fnCallbackFire" : _fnCallbackFire,
						"_fnJsonString" : _fnJsonString,
						"_fnRender" : _fnRender,
						"_fnNodeToColumnIndex" : _fnNodeToColumnIndex,
						"_fnInfoMacros" : _fnInfoMacros,
						"_fnBrowserDetect" : _fnBrowserDetect,
						"_fnGetColumns" : _fnGetColumns
					};

					$.extend(DataTable.ext.oApi, this.oApi);

					for (var sFunc in DataTable.ext.oApi ) {
						if (sFunc) {
							this[sFunc] = _fnExternApiFunc(sFunc);
						}
					}

					var _that = this;
					this.each(function() {
						var i = 0, iLen, j, jLen, k, kLen;
						var sId = this.getAttribute('id');
						var bInitHandedOff = false;
						var bUsePassedData = false;

						/* Sanity check */
						if (this.nodeName.toLowerCase() != 'table') {
							_fnLog(null, 0, "Attempted to initialise DataTables on a node which is not a " + "table: " + this.nodeName);
							return;
						}

						/* Check to see if we are re-initialising a table */
						for ( i = 0, iLen = DataTable.settings.length; i < iLen; i++) {
							/* Base check on table node */
							if (DataTable.settings[i].nTable == this) {
								if (oInit === undefined || oInit.bRetrieve) {
									return DataTable.settings[i].oInstance;
								} else if (oInit.bDestroy) {
									DataTable.settings[i].oInstance.fnDestroy();
									break;
								} else {
									_fnLog(DataTable.settings[i], 0, "Cannot reinitialise DataTable.\n\n" + "To retrieve the DataTables object for this table, pass no arguments or see " + "the docs for bRetrieve and bDestroy");
									return;
								}
							}

							if (DataTable.settings[i].sTableId == this.id) {
								DataTable.settings.splice(i, 1);
								break;
							}
						}

						/* Ensure the table has an ID - required for accessibility */
						if (sId === null || sId === "") {
							sId = "DataTables_Table_" + (DataTable.ext._oExternConfig.iNextUnique++);
							this.id = sId;
						}

						/* Create the settings object for this table and set some of the default parameters */
						var oSettings = $.extend(true, {}, DataTable.models.oSettings, {
							"nTable" : this,
							"oApi" : _that.oApi,
							"oInit" : oInit,
							"sDestroyWidth" : $(this).width(),
							"sInstance" : sId,
							"sTableId" : sId
						});
						DataTable.settings.push(oSettings);

						// Need to add the instance after the instance after the settings object has been added
						// to the settings array, so we can self reference the table instance if more than one
						oSettings.oInstance = (_that.length === 1) ? _that : $(this).dataTable();

						/* Setting up the initialisation object */
						if (!oInit) {
							oInit = {};
						}

						// Backwards compatibility, before we apply all the defaults
						if (oInit.oLanguage) {
							_fnLanguageCompat(oInit.oLanguage);
						}

						oInit = _fnExtend($.extend(true, {}, DataTable.defaults), oInit);

						// Map the initialisation options onto the settings object
						_fnMap(oSettings.oFeatures, oInit, "bPaginate");
						_fnMap(oSettings.oFeatures, oInit, "bLengthChange");
						_fnMap(oSettings.oFeatures, oInit, "bFilter");
						_fnMap(oSettings.oFeatures, oInit, "bSort");
						_fnMap(oSettings.oFeatures, oInit, "bInfo");
						_fnMap(oSettings.oFeatures, oInit, "bProcessing");
						_fnMap(oSettings.oFeatures, oInit, "bAutoWidth");
						_fnMap(oSettings.oFeatures, oInit, "bSortClasses");
						_fnMap(oSettings.oFeatures, oInit, "bServerSide");
						_fnMap(oSettings.oFeatures, oInit, "bDeferRender");
						_fnMap(oSettings.oScroll, oInit, "sScrollX", "sX");
						_fnMap(oSettings.oScroll, oInit, "sScrollXInner", "sXInner");
						_fnMap(oSettings.oScroll, oInit, "sScrollY", "sY");
						_fnMap(oSettings.oScroll, oInit, "bScrollCollapse", "bCollapse");
						_fnMap(oSettings.oScroll, oInit, "bScrollInfinite", "bInfinite");
						_fnMap(oSettings.oScroll, oInit, "iScrollLoadGap", "iLoadGap");
						_fnMap(oSettings.oScroll, oInit, "bScrollAutoCss", "bAutoCss");
						_fnMap(oSettings, oInit, "asStripeClasses");
						_fnMap(oSettings, oInit, "asStripClasses", "asStripeClasses");
						// legacy
						_fnMap(oSettings, oInit, "fnServerData");
						_fnMap(oSettings, oInit, "fnFormatNumber");
						_fnMap(oSettings, oInit, "sServerMethod");
						_fnMap(oSettings, oInit, "aaSorting");
						_fnMap(oSettings, oInit, "aaSortingFixed");
						_fnMap(oSettings, oInit, "aLengthMenu");
						_fnMap(oSettings, oInit, "sPaginationType");
						_fnMap(oSettings, oInit, "sAjaxSource");
						_fnMap(oSettings, oInit, "sAjaxDataProp");
						_fnMap(oSettings, oInit, "iCookieDuration");
						_fnMap(oSettings, oInit, "sCookiePrefix");
						_fnMap(oSettings, oInit, "sDom");
						_fnMap(oSettings, oInit, "bSortCellsTop");
						_fnMap(oSettings, oInit, "iTabIndex");
						_fnMap(oSettings, oInit, "oSearch", "oPreviousSearch");
						_fnMap(oSettings, oInit, "aoSearchCols", "aoPreSearchCols");
						_fnMap(oSettings, oInit, "iDisplayLength", "_iDisplayLength");
						_fnMap(oSettings, oInit, "bJQueryUI", "bJUI");
						_fnMap(oSettings, oInit, "fnCookieCallback");
						_fnMap(oSettings, oInit, "fnStateLoad");
						_fnMap(oSettings, oInit, "fnStateSave");
						_fnMap(oSettings.oLanguage, oInit, "fnInfoCallback");

						/* Callback functions which are array driven */
						_fnCallbackReg(oSettings, 'aoDrawCallback', oInit.fnDrawCallback, 'user');
						_fnCallbackReg(oSettings, 'aoServerParams', oInit.fnServerParams, 'user');
						_fnCallbackReg(oSettings, 'aoStateSaveParams', oInit.fnStateSaveParams, 'user');
						_fnCallbackReg(oSettings, 'aoStateLoadParams', oInit.fnStateLoadParams, 'user');
						_fnCallbackReg(oSettings, 'aoStateLoaded', oInit.fnStateLoaded, 'user');
						_fnCallbackReg(oSettings, 'aoRowCallback', oInit.fnRowCallback, 'user');
						_fnCallbackReg(oSettings, 'aoRowCreatedCallback', oInit.fnCreatedRow, 'user');
						_fnCallbackReg(oSettings, 'aoHeaderCallback', oInit.fnHeaderCallback, 'user');
						_fnCallbackReg(oSettings, 'aoFooterCallback', oInit.fnFooterCallback, 'user');
						_fnCallbackReg(oSettings, 'aoInitComplete', oInit.fnInitComplete, 'user');
						_fnCallbackReg(oSettings, 'aoPreDrawCallback', oInit.fnPreDrawCallback, 'user');

						if (oSettings.oFeatures.bServerSide && oSettings.oFeatures.bSort && oSettings.oFeatures.bSortClasses) {
							/* Enable sort classes for server-side processing. Safe to do it here, since server-side
							 * processing must be enabled by the developer
							 */
							_fnCallbackReg(oSettings, 'aoDrawCallback', _fnSortingClasses, 'server_side_sort_classes');
						} else if (oSettings.oFeatures.bDeferRender) {
							_fnCallbackReg(oSettings, 'aoDrawCallback', _fnSortingClasses, 'defer_sort_classes');
						}

						if (oInit.bJQueryUI) {
							/* Use the JUI classes object for display. You could clone the oStdClasses object if
							 * you want to have multiple tables with multiple independent classes
							 */
							$.extend(oSettings.oClasses, DataTable.ext.oJUIClasses);

							if (oInit.sDom === DataTable.defaults.sDom && DataTable.defaults.sDom === "lfrtip") {
								/* Set the DOM to use a layout suitable for jQuery UI's theming */
								oSettings.sDom = '<"H"lfr>t<"F"ip>';
							}
						} else {
							$.extend(oSettings.oClasses, DataTable.ext.oStdClasses);
						}
						$(this).addClass(oSettings.oClasses.sTable);

						/* Calculate the scroll bar width and cache it for use later on */
						if (oSettings.oScroll.sX !== "" || oSettings.oScroll.sY !== "") {
							oSettings.oScroll.iBarWidth = _fnScrollBarWidth();
						}

						if (oSettings.iInitDisplayStart === undefined) {
							/* Display start point, taking into account the save saving */
							oSettings.iInitDisplayStart = oInit.iDisplayStart;
							oSettings._iDisplayStart = oInit.iDisplayStart;
						}

						/* Must be done after everything which can be overridden by a cookie! */
						if (oInit.bStateSave) {
							oSettings.oFeatures.bStateSave = true;
							_fnLoadState(oSettings, oInit);
							_fnCallbackReg(oSettings, 'aoDrawCallback', _fnSaveState, 'state_save');
						}

						if (oInit.iDeferLoading !== null) {
							oSettings.bDeferLoading = true;
							var tmp = $.isArray(oInit.iDeferLoading);
							oSettings._iRecordsDisplay = tmp ? oInit.iDeferLoading[0] : oInit.iDeferLoading;
							oSettings._iRecordsTotal = tmp ? oInit.iDeferLoading[1] : oInit.iDeferLoading;
						}

						if (oInit.aaData !== null) {
							bUsePassedData = true;
						}

						/* Language definitions */
						if (oInit.oLanguage.sUrl !== "") {
							oSettings.oLanguage.sUrl = oInit.oLanguage.sUrl;
							$.getJSON(oSettings.oLanguage.sUrl, null, function(json) {
								_fnLanguageCompat(json);
								$.extend(true, oSettings.oLanguage, oInit.oLanguage, json);
								_fnInitialise(oSettings);
							});
							bInitHandedOff = true;
						} else {
							$.extend(true, oSettings.oLanguage, oInit.oLanguage);
						}

						/*
						 * Stripes
						 */
						if (oInit.asStripeClasses === null) {
							oSettings.asStripeClasses = [oSettings.oClasses.sStripeOdd, oSettings.oClasses.sStripeEven];
						}

						/* Remove row stripe classes if they are already on the table row */
						iLen = oSettings.asStripeClasses.length;
						oSettings.asDestroyStripes = [];
						if (iLen) {
							var bStripeRemove = false;
							var anRows = $(this).children('tbody').children('tr:lt(' + iLen + ')');
							for ( i = 0; i < iLen; i++) {
								if (anRows.hasClass(oSettings.asStripeClasses[i])) {
									bStripeRemove = true;

									/* Store the classes which we are about to remove so they can be re-added on destroy */
									oSettings.asDestroyStripes.push(oSettings.asStripeClasses[i]);
								}
							}

							if (bStripeRemove) {
								anRows.removeClass(oSettings.asStripeClasses.join(' '));
							}
						}

						/*
						 * Columns
						 * See if we should load columns automatically or use defined ones
						 */
						var anThs = [];
						var aoColumnsInit;
						var nThead = this.getElementsByTagName('thead');
						if (nThead.length !== 0) {
							_fnDetectHeader(oSettings.aoHeader, nThead[0]);
							anThs = _fnGetUniqueThs(oSettings);
						}

						/* If not given a column array, generate one with nulls */
						if (oInit.aoColumns === null) {
							aoColumnsInit = [];
							for ( i = 0, iLen = anThs.length; i < iLen; i++) {
								aoColumnsInit.push(null);
							}
						} else {
							aoColumnsInit = oInit.aoColumns;
						}

						/* Add the columns */
						for ( i = 0, iLen = aoColumnsInit.length; i < iLen; i++) {
							/* Short cut - use the loop to check if we have column visibility state to restore */
							if (oInit.saved_aoColumns !== undefined && oInit.saved_aoColumns.length == iLen) {
								if (aoColumnsInit[i] === null) {
									aoColumnsInit[i] = {};
								}
								aoColumnsInit[i].bVisible = oInit.saved_aoColumns[i].bVisible;
							}

							_fnAddColumn(oSettings, anThs ? anThs[i] : null);
						}

						/* Apply the column definitions */
						_fnApplyColumnDefs(oSettings, oInit.aoColumnDefs, aoColumnsInit, function(iCol, oDef) {
							_fnColumnOptions(oSettings, iCol, oDef);
						});

						/*
						 * Sorting
						 * Check the aaSorting array
						 */
						for ( i = 0, iLen = oSettings.aaSorting.length; i < iLen; i++) {
							if (oSettings.aaSorting[i][0] >= oSettings.aoColumns.length) {
								oSettings.aaSorting[i][0] = 0;
							}
							var oColumn = oSettings.aoColumns[oSettings.aaSorting[i][0]];

							/* Add a default sorting index */
							if (oSettings.aaSorting[i][2] === undefined) {
								oSettings.aaSorting[i][2] = 0;
							}

							/* If aaSorting is not defined, then we use the first indicator in asSorting */
							if (oInit.aaSorting === undefined && oSettings.saved_aaSorting === undefined) {
								oSettings.aaSorting[i][1] = oColumn.asSorting[0];
							}

							/* Set the current sorting index based on aoColumns.asSorting */
							for ( j = 0, jLen = oColumn.asSorting.length; j < jLen; j++) {
								if (oSettings.aaSorting[i][1] == oColumn.asSorting[j]) {
									oSettings.aaSorting[i][2] = j;
									break;
								}
							}
						}

						/* Do a first pass on the sorting classes (allows any size changes to be taken into
						 * account, and also will apply sorting disabled classes if disabled
						 */
						_fnSortingClasses(oSettings);

						/* Browser support detection */
						_fnBrowserDetect(oSettings);

						// Work around for Webkit bug 83867 - store the caption-side before removing from doc
						var captions = $(this).children('caption').each(function() {
							this._captionSide = $(this).css('caption-side');
						});

						var thead = $(this).children('thead');
						if (thead.length === 0) {
							thead = [document.createElement('thead')];
							this.appendChild(thead[0]);
						}
						oSettings.nTHead = thead[0];

						var tbody = $(this).children('tbody');
						if (tbody.length === 0) {
							tbody = [document.createElement('tbody')];
							this.appendChild(tbody[0]);
						}
						oSettings.nTBody = tbody[0];
						oSettings.nTBody.setAttribute("role", "alert");
						oSettings.nTBody.setAttribute("aria-live", "polite");
						oSettings.nTBody.setAttribute("aria-relevant", "all");

						var tfoot = $(this).children('tfoot');
						if (tfoot.length === 0 && captions.length > 0 && (oSettings.oScroll.sX !== "" || oSettings.oScroll.sY !== "")) {
							// If we are a scrolling table, and no footer has been given, then we need to create
							// a tfoot element for the caption element to be appended to
							tfoot = [document.createElement('tfoot')];
							this.appendChild(tfoot[0]);
						}

						if (tfoot.length > 0) {
							oSettings.nTFoot = tfoot[0];
							_fnDetectHeader(oSettings.aoFooter, oSettings.nTFoot);
						}

						/* Check if there is data passing into the constructor */
						if (bUsePassedData) {
							for ( i = 0; i < oInit.aaData.length; i++) {
								_fnAddData(oSettings, oInit.aaData[i]);
							}
						} else {
							/* Grab the data from the page */
							_fnGatherData(oSettings);
						}

						/* Copy the data index array */
						oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();

						/* Initialisation complete - table can be drawn */
						oSettings.bInitialised = true;

						/* Check if we need to initialise the table (it might not have been handed off to the
						 * language processor)
						 */
						if (bInitHandedOff === false) {
							_fnInitialise(oSettings);
						}
					});
					_that = null;
					return this;
				};

				DataTable.fnVersionCheck = function(sVersion) {
					/* This is cheap, but effective */
					var fnZPad = function(Zpad, count) {
						while (Zpad.length < count) {
							Zpad += '0';
						}
						return Zpad;
					};
					var aThis = DataTable.ext.sVersion.split('.');
					var aThat = sVersion.split('.');
					var sThis = '', sThat = '';

					for (var i = 0, iLen = aThat.length; i < iLen; i++) {
						sThis += fnZPad(aThis[i], 3);
						sThat += fnZPad(aThat[i], 3);
					}

					return parseInt(sThis, 10) >= parseInt(sThat, 10);
				};

				DataTable.fnIsDataTable = function(nTable) {
					var o = DataTable.settings;

					for (var i = 0; i < o.length; i++) {
						if (o[i].nTable === nTable || o[i].nScrollHead === nTable || o[i].nScrollFoot === nTable) {
							return true;
						}
					}

					return false;
				};

				DataTable.fnTables = function(bVisible) {
					var out = [];

					jQuery.each(DataTable.settings, function(i, o) {
						if (!bVisible || (bVisible === true && $(o.nTable).is(':visible'))) {
							out.push(o.nTable);
						}
					});

					return out;
				};

				DataTable.version = "1.9.4";

				DataTable.settings = [];

				DataTable.models = {};

				DataTable.models.ext = {
					
					"afnFiltering" : [],

					"afnSortData" : [],

					"aoFeatures" : [],

					"aTypes" : [],

					"fnVersionCheck" : DataTable.fnVersionCheck,

					"iApiIndex" : 0,

					"ofnSearch" : {},

					"oApi" : {},

					"oStdClasses" : {},

					"oJUIClasses" : {},

					"oPagination" : {},

					"oSort" : {},

					"sVersion" : DataTable.version,

					"sErrMode" : "alert",

					"_oExternConfig" : {
						/* int:iNextUnique - next unique number for an instance */
						"iNextUnique" : 0
					}
				};

				DataTable.models.oSearch = {
					
					"bCaseInsensitive" : true,

					"sSearch" : "",

					"bRegex" : false,

					"bSmart" : true
				};

				DataTable.models.oRow = {
					
					"nTr" : null,

					"_aData" : [],

					"_aSortData" : [],

					"_anHidden" : [],

					"_sRowStripe" : ""
				};

				DataTable.models.oColumn = {
					
					"aDataSort" : null,

					"asSorting" : null,

					"bSearchable" : null,

					"bSortable" : null,

					"bUseRendered" : null,

					"bVisible" : null,

					"_bAutoType" : true,

					"fnCreatedCell" : null,

					"fnGetData" : null,

					"fnRender" : null,

					"fnSetData" : null,

					"mData" : null,

					"mRender" : null,

					"nTh" : null,

					"nTf" : null,

					"sClass" : null,

					"sContentPadding" : null,

					"sDefaultContent" : null,

					"sName" : null,

					"sSortDataType" : 'std',

					"sSortingClass" : null,

					"sSortingClassJUI" : null,

					"sTitle" : null,

					"sType" : null,

					"sWidth" : null,

					"sWidthOrig" : null
				};

				DataTable.defaults = {
					
					"aaData" : null,

					"aaSorting" : [[0, 'asc']],

					"aaSortingFixed" : null,
					
					"aLengthMenu" : [10, 25, 50, 100],

					"aoColumns" : null,

					"aoColumnDefs" : null,

					"aoSearchCols" : [],

					"asStripeClasses" : null,

					"bAutoWidth" : true,

					"bDeferRender" : false,

					"bDestroy" : false,

					"bFilter" : true,

					"bInfo" : true,

					"bJQueryUI" : false,

					"bLengthChange" : true,

					"bPaginate" : true,

					"bProcessing" : false,

					"bRetrieve" : false,

					"bScrollAutoCss" : true,

					"bScrollCollapse" : false,

					"bScrollInfinite" : false,

					"bServerSide" : false,

					"bSort" : true,

					"bSortCellsTop" : false,

					"bSortClasses" : true,

					"bStateSave" : false,

					"fnCookieCallback" : null,

					"fnCreatedRow" : null,

					"fnDrawCallback" : null,

					"fnFooterCallback" : null,

					"fnFormatNumber" : function(iIn) {
						if (iIn < 1000) {
							// A small optimisation for what is likely to be the majority of use cases
							return iIn;
						}

						var s = (iIn + ""), a = s.split(""), out = "", iLen = s.length;

						for (var i = 0; i < iLen; i++) {
							if (i % 3 === 0 && i !== 0) {
								out = this.oLanguage.sInfoThousands + out;
							}
							out = a[iLen - i - 1] + out;
						}
						return out;
					},

					"fnHeaderCallback" : null,

					"fnInfoCallback" : null,

					"fnInitComplete" : null,

					"fnPreDrawCallback" : null,

					"fnRowCallback" : null,

					"fnServerData" : function(sUrl, aoData, fnCallback, oSettings) {
						oSettings.jqXHR = $.ajax({
							"url" : sUrl,
							"data" : aoData,
							"success" : function(json) {
								if (json.sError) {
									oSettings.oApi._fnLog(oSettings, 0, json.sError);
								}

								$(oSettings.oInstance).trigger('xhr', [oSettings, json]);
								fnCallback(json);
							},
							"dataType" : "json",
							"cache" : false,
							"type" : oSettings.sServerMethod,
							"error" : function(xhr, error, thrown) {
								if (error == "parsererror") {
									oSettings.oApi._fnLog(oSettings, 0, "DataTables warning: JSON data from " + "server could not be parsed. This is caused by a JSON formatting error.");
								}
							}
						});
					},

					"fnServerParams" : null,

					"fnStateLoad" : function(oSettings) {
						var sData = this.oApi._fnReadCookie(oSettings.sCookiePrefix + oSettings.sInstance);
						var oData;

						try {
							oData = ( typeof $.parseJSON === 'function') ? $.parseJSON(sData) : eval('(' + sData + ')');
						} catch (e) {
							oData = null;
						}

						return oData;
					},

					"fnStateLoadParams" : null,

					"fnStateLoaded" : null,

					"fnStateSave" : function(oSettings, oData) {
						this.oApi._fnCreateCookie(oSettings.sCookiePrefix + oSettings.sInstance, this.oApi._fnJsonString(oData), oSettings.iCookieDuration, oSettings.sCookiePrefix, oSettings.fnCookieCallback);
					},

					"fnStateSaveParams" : null,

					"iCookieDuration" : 7200,

					"iDeferLoading" : null,

					"iDisplayLength" : 10,

					"iDisplayStart" : 0,

					"iScrollLoadGap" : 100,

					"iTabIndex" : 0,

					"oLanguage" : {
						
						"oAria" : {
							
							"sSortAscending" : ": activate to sort column ascending",

							"sSortDescending" : ": activate to sort column descending"
						},

						"oPaginate" : {
							
							"sFirst" : "First",

							"sLast" : "Last",

							"sNext" : "Next",

							"sPrevious" : "Previous"
						},

						"sEmptyTable" : "No data available",

						"sInfo" : "Showing _START_ to _END_ of _TOTAL_ entries",

						"sInfoEmpty" : "Showing 0 to 0 of 0 entries",

						"sInfoFiltered" : "(filtered from _MAX_ total entries)",

						"sInfoPostFix" : "",

						"sInfoThousands" : ",",

						"sLengthMenu" : "Show _MENU_ entries",

						"sLoadingRecords" : "Loading...",

						"sProcessing" : "Processing...",

						"sSearch" : "Search:",

						"sUrl" : "",

						"sZeroRecords" : "No matching records found"
					},

					"oSearch" : $.extend({}, DataTable.models.oSearch),

					"sAjaxDataProp" : "aaData",

					"sAjaxSource" : null,

					"sCookiePrefix" : "SpryMedia_DataTables_",

					"sDom" : "lfrtip",

					"sPaginationType" : "two_button",

					"sScrollX" : "",

					"sScrollXInner" : "",

					"sScrollY" : "",

					"sServerMethod" : "GET"
				};

				DataTable.defaults.columns = {
					
					"aDataSort" : null,

					"asSorting" : ['asc', 'desc'],

					"bSearchable" : true,

					"bSortable" : true,

					"bUseRendered" : true,

					"bVisible" : true,

					"fnCreatedCell" : null,

					"fnRender" : null,

					"iDataSort" : -1,

					"mData" : null,

					"mRender" : null,

					"sCellType" : "td",

					"sClass" : "",

					"sContentPadding" : "",

					"sDefaultContent" : null,

					"sName" : "",

					"sSortDataType" : "std",

					"sTitle" : null,

					"sType" : null,

					"sWidth" : null
				};

				DataTable.models.oSettings = {
					"oFeatures" : {

						"bAutoWidth" : null,

						"bDeferRender" : null,

						"bFilter" : null,

						"bInfo" : null,

						"bLengthChange" : null,

						"bPaginate" : null,

						"bProcessing" : null,

						"bServerSide" : null,

						"bSort" : null,

						"bSortClasses" : null,

						"bStateSave" : null
					},

					"oScroll" : {
						
						"bAutoCss" : null,

						"bCollapse" : null,

						"bInfinite" : null,

						"iBarWidth" : 0,

						"iLoadGap" : null,

						"sX" : null,

						"sXInner" : null,

						"sY" : null
					},

					"oLanguage" : {
						
						"fnInfoCallback" : null
					},

					"oBrowser" : {
						
						"bScrollOversize" : false
					},

					"aanFeatures" : [],

					"aoData" : [],

					"aiDisplay" : [],

					"aiDisplayMaster" : [],

					"aoColumns" : [],

					"aoHeader" : [],

					"aoFooter" : [],

					"asDataSearch" : [],

					"oPreviousSearch" : {},

					"aoPreSearchCols" : [],

					"aaSorting" : null,

					"aaSortingFixed" : null,

					"asStripeClasses" : null,

					"asDestroyStripes" : [],

					"sDestroyWidth" : 0,

					"aoRowCallback" : [],

					"aoHeaderCallback" : [],

					"aoFooterCallback" : [],

					"aoDrawCallback" : [],

					"aoRowCreatedCallback" : [],

					"aoPreDrawCallback" : [],

					"aoInitComplete" : [],

					"aoStateSaveParams" : [],

					"aoStateLoadParams" : [],

					"aoStateLoaded" : [],

					"sTableId" : "",

					"nTable" : null,

					"nTHead" : null,

					"nTFoot" : null,

					"nTBody" : null,

					"nTableWrapper" : null,

					"bDeferLoading" : false,

					"bInitialised" : false,

					"aoOpenRows" : [],

					"sDom" : null,

					"sPaginationType" : "two_button",

					"iCookieDuration" : 0,

					"sCookiePrefix" : "",

					"fnCookieCallback" : null,

					"aoStateSave" : [],

					"aoStateLoad" : [],

					"oLoadedState" : null,

					"sAjaxSource" : null,

					"sAjaxDataProp" : null,

					"bAjaxDataGet" : true,

					"jqXHR" : null,

					"fnServerData" : null,

					"aoServerParams" : [],

					"sServerMethod" : null,

					"fnFormatNumber" : null,

					"aLengthMenu" : null,

					"iDraw" : 0,

					"bDrawing" : false,

					"iDrawError" : -1,

					"_iDisplayLength" : 10,

					"_iDisplayStart" : 0,

					"_iDisplayEnd" : 10,

					"_iRecordsTotal" : 0,

					"_iRecordsDisplay" : 0,

					"bJUI" : null,

					"oClasses" : {},

					"bFiltered" : false,

					"bSorted" : false,

					"bSortCellsTop" : null,

					"oInit" : null,

					"aoDestroyCallback" : [],

					"fnRecordsTotal" : function() {
						if (this.oFeatures.bServerSide) {
							return parseInt(this._iRecordsTotal, 10);
						} else {
							return this.aiDisplayMaster.length;
						}
					},

					"fnRecordsDisplay" : function() {
						if (this.oFeatures.bServerSide) {
							return parseInt(this._iRecordsDisplay, 10);
						} else {
							return this.aiDisplay.length;
						}
					},

					"fnDisplayEnd" : function() {
						if (this.oFeatures.bServerSide) {
							if (this.oFeatures.bPaginate === false || this._iDisplayLength == -1) {
								return this._iDisplayStart + this.aiDisplay.length;
							} else {
								return Math.min(this._iDisplayStart + this._iDisplayLength, this._iRecordsDisplay);
							}
						} else {
							return this._iDisplayEnd;
						}
					},

					"oInstance" : null,

					"sInstance" : null,

					"iTabIndex" : 0,

					"nScrollHead" : null,

					"nScrollFoot" : null
				};

				DataTable.ext = $.extend(true, {}, DataTable.models.ext);

				$.extend(DataTable.ext.oStdClasses, {
					"sTable" : "dataTable",

					/* Two buttons buttons */
					"sPagePrevEnabled" : "paginate_enabled_previous",
					"sPagePrevDisabled" : "paginate_disabled_previous",
					"sPageNextEnabled" : "paginate_enabled_next",
					"sPageNextDisabled" : "paginate_disabled_next",
					"sPageJUINext" : "",
					"sPageJUIPrev" : "",

					/* Full numbers paging buttons */
					"sPageButton" : "paginate_button",
					"sPageButtonActive" : "paginate_active",
					"sPageButtonStaticDisabled" : "paginate_button paginate_button_disabled",
					"sPageFirst" : "first",
					"sPagePrevious" : "previous",
					"sPageNext" : "next",
					"sPageLast" : "last",

					/* Striping classes */
					"sStripeOdd" : "odd",
					"sStripeEven" : "even",

					/* Empty row */
					"sRowEmpty" : "dataTables_empty",

					/* Features */
					"sWrapper" : "dataTables_wrapper",
					"sFilter" : "dataTables_filter",
					"sInfo" : "dataTables_info",
					"sPaging" : "dataTables_paginate paging_", /* Note that the type is postfixed */
					"sLength" : "dataTables_length",
					"sProcessing" : "dataTables_processing",

					/* Sorting */
					"sSortAsc" : "sorting_asc",
					"sSortDesc" : "sorting_desc",
					"sSortable" : "sorting", /* Sortable in both directions */
					"sSortableAsc" : "sorting_asc_disabled",
					"sSortableDesc" : "sorting_desc_disabled",
					"sSortableNone" : "sorting_disabled",
					"sSortColumn" : "sorting_", /* Note that an int is postfixed for the sorting order */
					"sSortJUIAsc" : "",
					"sSortJUIDesc" : "",
					"sSortJUI" : "",
					"sSortJUIAscAllowed" : "",
					"sSortJUIDescAllowed" : "",
					"sSortJUIWrapper" : "",
					"sSortIcon" : "",

					/* Scrolling */
					"sScrollWrapper" : "dataTables_scroll",
					"sScrollHead" : "dataTables_scrollHead",
					"sScrollHeadInner" : "dataTables_scrollHeadInner",
					"sScrollBody" : "dataTables_scrollBody",
					"sScrollFoot" : "dataTables_scrollFoot",
					"sScrollFootInner" : "dataTables_scrollFootInner",

					/* Misc */
					"sFooterTH" : "",
					"sJUIHeader" : "",
					"sJUIFooter" : ""
				});

				$.extend(DataTable.ext.oJUIClasses, DataTable.ext.oStdClasses, {
					/* Two buttons buttons */
					"sPagePrevEnabled" : "fg-button ui-button ui-state-default ui-corner-left",
					"sPagePrevDisabled" : "fg-button ui-button ui-state-default ui-corner-left ui-state-disabled",
					"sPageNextEnabled" : "fg-button ui-button ui-state-default ui-corner-right",
					"sPageNextDisabled" : "fg-button ui-button ui-state-default ui-corner-right ui-state-disabled",
					"sPageJUINext" : "ui-icon ui-icon-circle-arrow-e",
					"sPageJUIPrev" : "ui-icon ui-icon-circle-arrow-w",

					/* Full numbers paging buttons */
					"sPageButton" : "fg-button ui-button ui-state-default",
					"sPageButtonActive" : "fg-button ui-button ui-state-default ui-state-disabled",
					"sPageButtonStaticDisabled" : "fg-button ui-button ui-state-default ui-state-disabled",
					"sPageFirst" : "first ui-corner-tl ui-corner-bl",
					"sPageLast" : "last ui-corner-tr ui-corner-br",

					/* Features */
					"sPaging" : "dataTables_paginate fg-buttonset ui-buttonset fg-buttonset-multi " + "ui-buttonset-multi paging_", /* Note that the type is postfixed */

					/* Sorting */
					"sSortAsc" : "ui-state-default",
					"sSortDesc" : "ui-state-default",
					"sSortable" : "ui-state-default",
					"sSortableAsc" : "ui-state-default",
					"sSortableDesc" : "ui-state-default",
					"sSortableNone" : "ui-state-default",
					"sSortJUIAsc" : "css_right ui-icon ui-icon-triangle-1-n",
					"sSortJUIDesc" : "css_right ui-icon ui-icon-triangle-1-s",
					"sSortJUI" : "css_right ui-icon ui-icon-carat-2-n-s",
					"sSortJUIAscAllowed" : "css_right ui-icon ui-icon-carat-1-n",
					"sSortJUIDescAllowed" : "css_right ui-icon ui-icon-carat-1-s",
					"sSortJUIWrapper" : "DataTables_sort_wrapper",
					"sSortIcon" : "DataTables_sort_icon",

					/* Scrolling */
					"sScrollHead" : "dataTables_scrollHead ui-state-default",
					"sScrollFoot" : "dataTables_scrollFoot ui-state-default",

					/* Misc */
					"sFooterTH" : "ui-state-default",
					"sJUIHeader" : "fg-toolbar ui-toolbar ui-widget-header ui-corner-tl ui-corner-tr ui-helper-clearfix",
					"sJUIFooter" : "fg-toolbar ui-toolbar ui-widget-header ui-corner-bl ui-corner-br ui-helper-clearfix"
				});

				$.extend(DataTable.ext.oPagination, {
					
					"two_button" : {
						
						"fnInit" : function(oSettings, nPaging, fnCallbackDraw) {
							var oLang = oSettings.oLanguage.oPaginate;
							var oClasses = oSettings.oClasses;
							var fnClickHandler = function(e) {
								if (oSettings.oApi._fnPageChange(oSettings, e.data.action)) {
									fnCallbackDraw(oSettings);
								}
							};

							var sAppend = (!oSettings.bJUI) ? '<a class="' + oSettings.oClasses.sPagePrevDisabled + '" tabindex="' + oSettings.iTabIndex + '" role="button">' + oLang.sPrevious + '</a>' + '<a class="' + oSettings.oClasses.sPageNextDisabled + '" tabindex="' + oSettings.iTabIndex + '" role="button">' + oLang.sNext + '</a>' : '<a class="' + oSettings.oClasses.sPagePrevDisabled + '" tabindex="' + oSettings.iTabIndex + '" role="button"><span class="' + oSettings.oClasses.sPageJUIPrev + '"></span></a>' + '<a class="' + oSettings.oClasses.sPageNextDisabled + '" tabindex="' + oSettings.iTabIndex + '" role="button"><span class="' + oSettings.oClasses.sPageJUINext + '"></span></a>';
							$(nPaging).append(sAppend);

							var els = $('a', nPaging);
							var nPrevious = els[0], nNext = els[1];

							oSettings.oApi._fnBindAction(nPrevious, {
								action : "previous"
							}, fnClickHandler);
							oSettings.oApi._fnBindAction(nNext, {
								action : "next"
							}, fnClickHandler);

							/* ID the first elements only */
							if (!oSettings.aanFeatures.p) {
								nPaging.id = oSettings.sTableId + '_paginate';
								nPrevious.id = oSettings.sTableId + '_previous';
								nNext.id = oSettings.sTableId + '_next';

								nPrevious.setAttribute('aria-controls', oSettings.sTableId);
								nNext.setAttribute('aria-controls', oSettings.sTableId);
							}
						},

						"fnUpdate" : function(oSettings, fnCallbackDraw) {
							if (!oSettings.aanFeatures.p) {
								return;
							}

							var oClasses = oSettings.oClasses;
							var an = oSettings.aanFeatures.p;
							var nNode;

							/* Loop over each instance of the pager */
							for (var i = 0, iLen = an.length; i < iLen; i++) {
								nNode = an[i].firstChild;
								if (nNode) {
									/* Previous page */
									nNode.className = (oSettings._iDisplayStart === 0 ) ? oClasses.sPagePrevDisabled : oClasses.sPagePrevEnabled;

									/* Next page */
									nNode = nNode.nextSibling;
									nNode.className = (oSettings.fnDisplayEnd() == oSettings.fnRecordsDisplay() ) ? oClasses.sPageNextDisabled : oClasses.sPageNextEnabled;
								}
							}
						}
					},

					"iFullNumbersShowPages" : 5,

					"full_numbers" : {
						
						"fnInit" : function(oSettings, nPaging, fnCallbackDraw) {
							var oLang = oSettings.oLanguage.oPaginate;
							var oClasses = oSettings.oClasses;
							var fnClickHandler = function(e) {
								if (oSettings.oApi._fnPageChange(oSettings, e.data.action)) {
									fnCallbackDraw(oSettings);
								}
							};

							$(nPaging).append('<a  tabindex="' + oSettings.iTabIndex + '" class="' + oClasses.sPageButton + " " + oClasses.sPageFirst + '">' + oLang.sFirst + '</a>' + '<a  tabindex="' + oSettings.iTabIndex + '" class="' + oClasses.sPageButton + " " + oClasses.sPagePrevious + '">' + oLang.sPrevious + '</a>' + '<span></span>' + '<a tabindex="' + oSettings.iTabIndex + '" class="' + oClasses.sPageButton + " " + oClasses.sPageNext + '">' + oLang.sNext + '</a>' + '<a tabindex="' + oSettings.iTabIndex + '" class="' + oClasses.sPageButton + " " + oClasses.sPageLast + '">' + oLang.sLast + '</a>');
							var els = $('a', nPaging);
							var nFirst = els[0], nPrev = els[1], nNext = els[2], nLast = els[3];

							oSettings.oApi._fnBindAction(nFirst, {
								action : "first"
							}, fnClickHandler);
							oSettings.oApi._fnBindAction(nPrev, {
								action : "previous"
							}, fnClickHandler);
							oSettings.oApi._fnBindAction(nNext, {
								action : "next"
							}, fnClickHandler);
							oSettings.oApi._fnBindAction(nLast, {
								action : "last"
							}, fnClickHandler);

							/* ID the first elements only */
							if (!oSettings.aanFeatures.p) {
								nPaging.id = oSettings.sTableId + '_paginate';
								nFirst.id = oSettings.sTableId + '_first';
								nPrev.id = oSettings.sTableId + '_previous';
								nNext.id = oSettings.sTableId + '_next';
								nLast.id = oSettings.sTableId + '_last';
							}
						},

						"fnUpdate" : function(oSettings, fnCallbackDraw) {
							if (!oSettings.aanFeatures.p) {
								return;
							}

							var iPageCount = DataTable.ext.oPagination.iFullNumbersShowPages;
							var iPageCountHalf = Math.floor(iPageCount / 2);
							var iPages = Math.ceil((oSettings.fnRecordsDisplay()) / oSettings._iDisplayLength);
							var iCurrentPage = Math.ceil(oSettings._iDisplayStart / oSettings._iDisplayLength) + 1;
							var sList = "";
							var iStartButton, iEndButton, i, iLen;
							var oClasses = oSettings.oClasses;
							var anButtons, anStatic, nPaginateList, nNode;
							var an = oSettings.aanFeatures.p;
							var fnBind = function(j) {
								oSettings.oApi._fnBindAction(this, {
									"page" : j + iStartButton - 1
								}, function(e) {
									/* Use the information in the element to jump to the required page */
									oSettings.oApi._fnPageChange(oSettings, e.data.page);
									fnCallbackDraw(oSettings);
									e.preventDefault();
								});
							};

							/* Pages calculation */
							if (oSettings._iDisplayLength === -1) {
								iStartButton = 1;
								iEndButton = 1;
								iCurrentPage = 1;
							} else if (iPages < iPageCount) {
								iStartButton = 1;
								iEndButton = iPages;
							} else if (iCurrentPage <= iPageCountHalf) {
								iStartButton = 1;
								iEndButton = iPageCount;
							} else if (iCurrentPage >= (iPages - iPageCountHalf)) {
								iStartButton = iPages - iPageCount + 1;
								iEndButton = iPages;
							} else {
								iStartButton = iCurrentPage - Math.ceil(iPageCount / 2) + 1;
								iEndButton = iStartButton + iPageCount - 1;
							}

							/* Build the dynamic list */
							for ( i = iStartButton; i <= iEndButton; i++) {
								sList += (iCurrentPage !== i) ? '<a tabindex="' + oSettings.iTabIndex + '" class="' + oClasses.sPageButton + '">' + oSettings.fnFormatNumber(i) + '</a>' : '<a tabindex="' + oSettings.iTabIndex + '" class="' + oClasses.sPageButtonActive + '">' + oSettings.fnFormatNumber(i) + '</a>';
							}

							/* Loop over each instance of the pager */
							for ( i = 0, iLen = an.length; i < iLen; i++) {
								nNode = an[i];
								if (!nNode.hasChildNodes()) {
									continue;
								}

								/* Build up the dynamic list first - html and listeners */
								$('span:eq(0)', nNode).html(sList).children('a').each(fnBind);

								/* Update the permanent button's classes */
								anButtons = nNode.getElementsByTagName('a');
								anStatic = [anButtons[0], anButtons[1], anButtons[anButtons.length - 2], anButtons[anButtons.length - 1]];

								$(anStatic).removeClass(oClasses.sPageButton + " " + oClasses.sPageButtonActive + " " + oClasses.sPageButtonStaticDisabled);
								$([anStatic[0], anStatic[1]]).addClass((iCurrentPage == 1) ? oClasses.sPageButtonStaticDisabled : oClasses.sPageButton);
								$([anStatic[2], anStatic[3]]).addClass((iPages === 0 || iCurrentPage === iPages || oSettings._iDisplayLength === -1) ? oClasses.sPageButtonStaticDisabled : oClasses.sPageButton);
							}
						}
					}
				});

				$.extend(DataTable.ext.oSort, {
					/*
					 * text sorting
					 */
					"string-pre" : function(a) {
						if ( typeof a != 'string') {
							a = (a !== null && a.toString) ? a.toString() : '';
						}
						return a.toLowerCase();
					},

					"string-asc" : function(x, y) {
						return ((x < y) ? -1 : ((x > y) ? 1 : 0));
					},

					"string-desc" : function(x, y) {
						return ((x < y) ? 1 : ((x > y) ? -1 : 0));
					},

					/*
					 * html sorting (ignore html tags)
					 */
					"html-pre" : function(a) {
						return a.replace(/<.*?>/g, "").toLowerCase();
					},

					"html-asc" : function(x, y) {
						return ((x < y) ? -1 : ((x > y) ? 1 : 0));
					},

					"html-desc" : function(x, y) {
						return ((x < y) ? 1 : ((x > y) ? -1 : 0));
					},

					/*
					 * date sorting
					 */
					"date-pre" : function(a) {
						var x = Date.parse(a);

						if (isNaN(x) || x === "") {
							x = Date.parse("01/01/1970 00:00:00");
						}
						return x;
					},

					"date-asc" : function(x, y) {
						return x - y;
					},

					"date-desc" : function(x, y) {
						return y - x;
					},

					/*
					 * numerical sorting
					 */
					"numeric-pre" : function(a) {
						return (a == "-" || a === "") ? 0 : a * 1;
					},

					"numeric-asc" : function(x, y) {
						return x - y;
					},

					"numeric-desc" : function(x, y) {
						return y - x;
					}
				});

				$.extend(DataTable.ext.aTypes, [
				
				function(sData) {
					/* Allow zero length strings as a number */
					if ( typeof sData === 'number') {
						return 'numeric';
					} else if ( typeof sData !== 'string') {
						return null;
					}

					var sValidFirstChars = "0123456789-";
					var sValidChars = "0123456789.";
					var Char;
					var bDecimal = false;

					/* Check for a valid first char (no period and allow negatives) */
					Char = sData.charAt(0);
					if (sValidFirstChars.indexOf(Char) == -1) {
						return null;
					}

					/* Check all the other characters are valid */
					for (var i = 1; i < sData.length; i++) {
						Char = sData.charAt(i);
						if (sValidChars.indexOf(Char) == -1) {
							return null;
						}

						/* Only allowed one decimal place... */
						if (Char == ".") {
							if (bDecimal) {
								return null;
							}
							bDecimal = true;
						}
					}

					return 'numeric';
				},

				function(sData) {
					var iParse = Date.parse(sData);
					if ((iParse !== null && !isNaN(iParse)) || ( typeof sData === 'string' && sData.length === 0)) {
						return 'date';
					}
					return null;
				},

				function(sData) {
					if ( typeof sData === 'string' && sData.indexOf('<') != -1 && sData.indexOf('>') != -1) {
						return 'html';
					}
					return null;
				}]);

				// jQuery aliases
				$.fn.DataTable = DataTable;
				$.fn.dataTable = DataTable;
				$.fn.dataTableSettings = DataTable.settings;
				$.fn.dataTableExt = DataTable.ext;

			}));

	}(window, document));


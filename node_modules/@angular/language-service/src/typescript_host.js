/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/src/typescript_host", ["require", "exports", "tslib", "@angular/compiler", "@angular/core", "typescript/lib/tsserverlibrary", "@angular/language-service/src/language_service", "@angular/language-service/src/reflector_host", "@angular/language-service/src/template", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/core");
    var tss = require("typescript/lib/tsserverlibrary");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var reflector_host_1 = require("@angular/language-service/src/reflector_host");
    var template_1 = require("@angular/language-service/src/template");
    var utils_1 = require("@angular/language-service/src/utils");
    /**
     * Create a `LanguageServiceHost`
     */
    function createLanguageServiceFromTypescript(host, service) {
        var ngHost = new TypeScriptServiceHost(host, service);
        var ngServer = language_service_1.createLanguageService(ngHost);
        return ngServer;
    }
    exports.createLanguageServiceFromTypescript = createLanguageServiceFromTypescript;
    /**
     * The language service never needs the normalized versions of the metadata. To avoid parsing
     * the content and resolving references, return an empty file. This also allows normalizing
     * template that are syntatically incorrect which is required to provide completions in
     * syntactically incorrect templates.
     */
    var DummyHtmlParser = /** @class */ (function (_super) {
        tslib_1.__extends(DummyHtmlParser, _super);
        function DummyHtmlParser() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        DummyHtmlParser.prototype.parse = function () {
            return new compiler_1.ParseTreeResult([], []);
        };
        return DummyHtmlParser;
    }(compiler_1.HtmlParser));
    exports.DummyHtmlParser = DummyHtmlParser;
    /**
     * Avoid loading resources in the language servcie by using a dummy loader.
     */
    var DummyResourceLoader = /** @class */ (function (_super) {
        tslib_1.__extends(DummyResourceLoader, _super);
        function DummyResourceLoader() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        DummyResourceLoader.prototype.get = function (_url) {
            return Promise.resolve('');
        };
        return DummyResourceLoader;
    }(compiler_1.ResourceLoader));
    exports.DummyResourceLoader = DummyResourceLoader;
    /**
     * An implementation of a `LanguageServiceHost` for a TypeScript project.
     *
     * The `TypeScriptServiceHost` implements the Angular `LanguageServiceHost` using
     * the TypeScript language services.
     *
     * @publicApi
     */
    var TypeScriptServiceHost = /** @class */ (function () {
        function TypeScriptServiceHost(tsLsHost, tsLS) {
            var _this = this;
            this.tsLsHost = tsLsHost;
            this.tsLS = tsLS;
            this.staticSymbolCache = new compiler_1.StaticSymbolCache();
            this.fileToComponent = new Map();
            this.collectedErrors = new Map();
            this.fileVersions = new Map();
            this.lastProgram = undefined;
            this.analyzedModules = {
                files: [],
                ngModuleByPipeOrDirective: new Map(),
                ngModules: [],
            };
            this.summaryResolver = new compiler_1.AotSummaryResolver({
                loadSummary: function (_filePath) {
                    return null;
                },
                isSourceFile: function (_sourceFilePath) {
                    return true;
                },
                toSummaryFileName: function (sourceFilePath) {
                    return sourceFilePath;
                },
                fromSummaryFileName: function (filePath) {
                    return filePath;
                },
            }, this.staticSymbolCache);
            this.reflectorHost = new reflector_host_1.ReflectorHost(function () { return _this.program; }, tsLsHost);
            this.staticSymbolResolver = new compiler_1.StaticSymbolResolver(this.reflectorHost, this.staticSymbolCache, this.summaryResolver, function (e, filePath) { return _this.collectError(e, filePath); });
        }
        Object.defineProperty(TypeScriptServiceHost.prototype, "resolver", {
            /**
             * Return the singleton instance of the MetadataResolver.
             */
            get: function () {
                var _this = this;
                if (this._resolver) {
                    return this._resolver;
                }
                // StaticReflector keeps its own private caches that are not clearable.
                // We have no choice but to create a new instance to invalidate the caches.
                // TODO: Revisit this when language service gets rewritten for Ivy.
                var staticReflector = new compiler_1.StaticReflector(this.summaryResolver, this.staticSymbolResolver, [], // knownMetadataClasses
                [], // knownMetadataFunctions
                function (e, filePath) { return _this.collectError(e, filePath); });
                // Because static reflector above is changed, we need to create a new
                // resolver.
                var moduleResolver = new compiler_1.NgModuleResolver(staticReflector);
                var directiveResolver = new compiler_1.DirectiveResolver(staticReflector);
                var pipeResolver = new compiler_1.PipeResolver(staticReflector);
                var elementSchemaRegistry = new compiler_1.DomElementSchemaRegistry();
                var resourceLoader = new DummyResourceLoader();
                var urlResolver = compiler_1.createOfflineCompileUrlResolver();
                var htmlParser = new DummyHtmlParser();
                // This tracks the CompileConfig in codegen.ts. Currently these options
                // are hard-coded.
                var config = new compiler_1.CompilerConfig({
                    defaultEncapsulation: core_1.ViewEncapsulation.Emulated,
                    useJit: false,
                });
                var directiveNormalizer = new compiler_1.DirectiveNormalizer(resourceLoader, urlResolver, htmlParser, config);
                this._resolver = new compiler_1.CompileMetadataResolver(config, htmlParser, moduleResolver, directiveResolver, pipeResolver, new compiler_1.JitSummaryResolver(), elementSchemaRegistry, directiveNormalizer, new core_1.ɵConsole(), this.staticSymbolCache, staticReflector, function (error, type) { return _this.collectError(error, type && type.filePath); });
                return this._resolver;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TypeScriptServiceHost.prototype, "reflector", {
            /**
             * Return the singleton instance of the StaticReflector hosted in the
             * MetadataResolver.
             */
            get: function () {
                return this.resolver.getReflector();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Checks whether the program has changed and returns all analyzed modules.
         * If program has changed, invalidate all caches and update fileToComponent
         * and templateReferences.
         * In addition to returning information about NgModules, this method plays the
         * same role as 'synchronizeHostData' in tsserver.
         */
        TypeScriptServiceHost.prototype.getAnalyzedModules = function () {
            var e_1, _a, e_2, _b;
            if (this.upToDate()) {
                return this.analyzedModules;
            }
            // Invalidate caches
            this.fileToComponent.clear();
            this.collectedErrors.clear();
            this.resolver.clearCache();
            var analyzeHost = {
                isSourceFile: function (_filePath) {
                    return true;
                }
            };
            var programFiles = this.program.getSourceFiles().map(function (sf) { return sf.fileName; });
            this.analyzedModules =
                compiler_1.analyzeNgModules(programFiles, analyzeHost, this.staticSymbolResolver, this.resolver);
            // update template references and fileToComponent
            var urlResolver = compiler_1.createOfflineCompileUrlResolver();
            try {
                for (var _c = tslib_1.__values(this.analyzedModules.ngModules), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var ngModule = _d.value;
                    try {
                        for (var _e = (e_2 = void 0, tslib_1.__values(ngModule.declaredDirectives)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var directive = _f.value;
                            var metadata = this.resolver.getNonNormalizedDirectiveMetadata(directive.reference).metadata;
                            if (metadata.isComponent && metadata.template && metadata.template.templateUrl) {
                                var templateName = urlResolver.resolve(this.reflector.componentModuleUrl(directive.reference), metadata.template.templateUrl);
                                this.fileToComponent.set(templateName, directive.reference);
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return this.analyzedModules;
        };
        /**
         * Checks whether the program has changed, and invalidate static symbols in
         * the source files that have changed.
         * Returns true if modules are up-to-date, false otherwise.
         * This should only be called by getAnalyzedModules().
         */
        TypeScriptServiceHost.prototype.upToDate = function () {
            var e_3, _a, e_4, _b, e_5, _c;
            var _d = this, lastProgram = _d.lastProgram, program = _d.program;
            if (lastProgram === program) {
                return true;
            }
            this.lastProgram = program;
            // Even though the program has changed, it could be the case that none of
            // the source files have changed. If all source files remain the same, then
            // program is still up-to-date, and we should not invalidate caches.
            var filesAdded = 0;
            var filesChangedOrRemoved = [];
            // Check if any source files have been added / changed since last computation.
            var seen = new Set();
            try {
                for (var _e = tslib_1.__values(program.getSourceFiles()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var fileName = _f.value.fileName;
                    seen.add(fileName);
                    var version = this.tsLsHost.getScriptVersion(fileName);
                    var lastVersion = this.fileVersions.get(fileName);
                    if (lastVersion === undefined) {
                        filesAdded++;
                        this.fileVersions.set(fileName, version);
                    }
                    else if (version !== lastVersion) {
                        filesChangedOrRemoved.push(fileName); // changed
                        this.fileVersions.set(fileName, version);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
            try {
                // Check if any source files have been removed since last computation.
                for (var _g = tslib_1.__values(this.fileVersions), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var _j = tslib_1.__read(_h.value, 1), fileName = _j[0];
                    if (!seen.has(fileName)) {
                        filesChangedOrRemoved.push(fileName); // removed
                        // Because Maps are iterated in insertion order, it is safe to delete
                        // entries from the same map while iterating.
                        // See https://stackoverflow.com/questions/35940216 and
                        // https://www.ecma-international.org/ecma-262/10.0/index.html#sec-map.prototype.foreach
                        this.fileVersions.delete(fileName);
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                }
                finally { if (e_4) throw e_4.error; }
            }
            try {
                for (var filesChangedOrRemoved_1 = tslib_1.__values(filesChangedOrRemoved), filesChangedOrRemoved_1_1 = filesChangedOrRemoved_1.next(); !filesChangedOrRemoved_1_1.done; filesChangedOrRemoved_1_1 = filesChangedOrRemoved_1.next()) {
                    var fileName = filesChangedOrRemoved_1_1.value;
                    var symbols = this.staticSymbolResolver.invalidateFile(fileName);
                    this.reflector.invalidateSymbols(symbols);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (filesChangedOrRemoved_1_1 && !filesChangedOrRemoved_1_1.done && (_c = filesChangedOrRemoved_1.return)) _c.call(filesChangedOrRemoved_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
            // Program is up-to-date iff no files are added, changed, or removed.
            return filesAdded === 0 && filesChangedOrRemoved.length === 0;
        };
        /**
         * Find all templates in the specified `file`.
         * @param fileName TS or HTML file
         */
        TypeScriptServiceHost.prototype.getTemplates = function (fileName) {
            var _this = this;
            var results = [];
            if (fileName.endsWith('.ts')) {
                // Find every template string in the file
                var visit_1 = function (child) {
                    var template = _this.getInternalTemplate(child);
                    if (template) {
                        results.push(template);
                    }
                    else {
                        tss.forEachChild(child, visit_1);
                    }
                };
                var sourceFile = this.getSourceFile(fileName);
                if (sourceFile) {
                    tss.forEachChild(sourceFile, visit_1);
                }
            }
            else {
                var template = this.getExternalTemplate(fileName);
                if (template) {
                    results.push(template);
                }
            }
            return results;
        };
        /**
         * Return metadata about all class declarations in the file that are Angular
         * directives. Potential matches are `@NgModule`, `@Component`, `@Directive`,
         * `@Pipes`, etc. class declarations.
         *
         * @param fileName TS file
         */
        TypeScriptServiceHost.prototype.getDeclarations = function (fileName) {
            var _this = this;
            if (!fileName.endsWith('.ts')) {
                return [];
            }
            var sourceFile = this.getSourceFile(fileName);
            if (!sourceFile) {
                return [];
            }
            var results = [];
            var visit = function (child) {
                var candidate = utils_1.getDirectiveClassLike(child);
                if (candidate) {
                    var classId = candidate.classId;
                    var declarationSpan = spanOf(classId);
                    var className = classId.getText();
                    var classSymbol = _this.reflector.getStaticSymbol(sourceFile.fileName, className);
                    // Ask the resolver to check if candidate is actually Angular directive
                    if (!_this.resolver.isDirective(classSymbol)) {
                        return;
                    }
                    var data = _this.resolver.getNonNormalizedDirectiveMetadata(classSymbol);
                    if (!data) {
                        return;
                    }
                    results.push({
                        type: classSymbol,
                        declarationSpan: declarationSpan,
                        metadata: data.metadata,
                        errors: _this.getCollectedErrors(declarationSpan, sourceFile),
                    });
                }
                else {
                    child.forEachChild(visit);
                }
            };
            tss.forEachChild(sourceFile, visit);
            return results;
        };
        TypeScriptServiceHost.prototype.getSourceFile = function (fileName) {
            if (!fileName.endsWith('.ts')) {
                throw new Error("Non-TS source file requested: " + fileName);
            }
            return this.program.getSourceFile(fileName);
        };
        Object.defineProperty(TypeScriptServiceHost.prototype, "program", {
            get: function () {
                var program = this.tsLS.getProgram();
                if (!program) {
                    // Program is very very unlikely to be undefined.
                    throw new Error('No program in language service!');
                }
                return program;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Return the TemplateSource if `node` is a template node.
         *
         * For example,
         *
         * @Component({
         *   template: '<div></div>' <-- template node
         * })
         * class AppComponent {}
         *           ^---- class declaration node
         *
         * @param node Potential template node
         */
        TypeScriptServiceHost.prototype.getInternalTemplate = function (node) {
            if (!tss.isStringLiteralLike(node)) {
                return;
            }
            var tmplAsgn = utils_1.getPropertyAssignmentFromValue(node);
            if (!tmplAsgn || tmplAsgn.name.getText() !== 'template') {
                return;
            }
            var classDecl = utils_1.getClassDeclFromDecoratorProp(tmplAsgn);
            if (!classDecl || !classDecl.name) { // Does not handle anonymous class
                return;
            }
            var fileName = node.getSourceFile().fileName;
            var classSymbol = this.reflector.getStaticSymbol(fileName, classDecl.name.text);
            return new template_1.InlineTemplate(node, classDecl, classSymbol, this);
        };
        /**
         * Return the external template for `fileName`.
         * @param fileName HTML file
         */
        TypeScriptServiceHost.prototype.getExternalTemplate = function (fileName) {
            // First get the text for the template
            var snapshot = this.tsLsHost.getScriptSnapshot(fileName);
            if (!snapshot) {
                return;
            }
            var source = snapshot.getText(0, snapshot.getLength());
            // Next find the component class symbol
            var classSymbol = this.fileToComponent.get(fileName);
            if (!classSymbol) {
                return;
            }
            // Then use the class symbol to find the actual ts.ClassDeclaration node
            var sourceFile = this.getSourceFile(classSymbol.filePath);
            if (!sourceFile) {
                return;
            }
            // TODO: This only considers top-level class declarations in a source file.
            // This would not find a class declaration in a namespace, for example.
            var classDecl = sourceFile.forEachChild(function (child) {
                if (tss.isClassDeclaration(child) && child.name && child.name.text === classSymbol.name) {
                    return child;
                }
            });
            if (!classDecl) {
                return;
            }
            return new template_1.ExternalTemplate(source, fileName, classDecl, classSymbol, this);
        };
        TypeScriptServiceHost.prototype.collectError = function (error, filePath) {
            if (filePath) {
                var errors = this.collectedErrors.get(filePath);
                if (!errors) {
                    errors = [];
                    this.collectedErrors.set(filePath, errors);
                }
                errors.push(error);
            }
        };
        TypeScriptServiceHost.prototype.getCollectedErrors = function (defaultSpan, sourceFile) {
            var errors = this.collectedErrors.get(sourceFile.fileName);
            if (!errors) {
                return [];
            }
            // TODO: Add better typings for the errors
            return errors.map(function (e) {
                var line = e.line || (e.position && e.position.line);
                var column = e.column || (e.position && e.position.column);
                var span = spanAt(sourceFile, line, column) || defaultSpan;
                if (compiler_1.isFormattedError(e)) {
                    return errorToDiagnosticWithChain(e, span);
                }
                return { message: e.message, span: span };
            });
        };
        /**
         * Return the parsed template for the template at the specified `position`.
         * @param fileName TS or HTML file
         * @param position Position of the template in the TS file, otherwise ignored.
         */
        TypeScriptServiceHost.prototype.getTemplateAstAtPosition = function (fileName, position) {
            var template;
            if (fileName.endsWith('.ts')) {
                var sourceFile = this.getSourceFile(fileName);
                if (!sourceFile) {
                    return;
                }
                // Find the node that most closely matches the position
                var node = utils_1.findTightestNode(sourceFile, position);
                if (!node) {
                    return;
                }
                template = this.getInternalTemplate(node);
            }
            else {
                template = this.getExternalTemplate(fileName);
            }
            if (!template) {
                return;
            }
            return this.getTemplateAst(template);
        };
        /**
         * Find the NgModule which the directive associated with the `classSymbol`
         * belongs to, then return its schema and transitive directives and pipes.
         * @param classSymbol Angular Symbol that defines a directive
         */
        TypeScriptServiceHost.prototype.getModuleMetadataForDirective = function (classSymbol) {
            var e_6, _a, e_7, _b, _c;
            var result = {
                directives: [],
                pipes: [],
                schemas: [],
            };
            // First find which NgModule the directive belongs to.
            var ngModule = this.analyzedModules.ngModuleByPipeOrDirective.get(classSymbol) ||
                findSuitableDefaultModule(this.analyzedModules);
            if (!ngModule) {
                return result;
            }
            // Then gather all transitive directives and pipes.
            var _d = ngModule.transitiveModule, directives = _d.directives, pipes = _d.pipes;
            try {
                for (var directives_1 = tslib_1.__values(directives), directives_1_1 = directives_1.next(); !directives_1_1.done; directives_1_1 = directives_1.next()) {
                    var directive = directives_1_1.value;
                    var data = this.resolver.getNonNormalizedDirectiveMetadata(directive.reference);
                    if (data) {
                        result.directives.push(data.metadata.toSummary());
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (directives_1_1 && !directives_1_1.done && (_a = directives_1.return)) _a.call(directives_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
            try {
                for (var pipes_1 = tslib_1.__values(pipes), pipes_1_1 = pipes_1.next(); !pipes_1_1.done; pipes_1_1 = pipes_1.next()) {
                    var pipe = pipes_1_1.value;
                    var metadata = this.resolver.getOrLoadPipeMetadata(pipe.reference);
                    result.pipes.push(metadata.toSummary());
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (pipes_1_1 && !pipes_1_1.done && (_b = pipes_1.return)) _b.call(pipes_1);
                }
                finally { if (e_7) throw e_7.error; }
            }
            (_c = result.schemas).push.apply(_c, tslib_1.__spread(ngModule.schemas));
            return result;
        };
        /**
         * Parse the `template` and return its AST, if any.
         * @param template template to be parsed
         */
        TypeScriptServiceHost.prototype.getTemplateAst = function (template) {
            var classSymbol = template.type, fileName = template.fileName;
            var data = this.resolver.getNonNormalizedDirectiveMetadata(classSymbol);
            if (!data) {
                return;
            }
            var htmlParser = new compiler_1.HtmlParser();
            var expressionParser = new compiler_1.Parser(new compiler_1.Lexer());
            var parser = new compiler_1.TemplateParser(new compiler_1.CompilerConfig(), this.reflector, expressionParser, new compiler_1.DomElementSchemaRegistry(), htmlParser, null, // console
            [] // tranforms
            );
            var htmlResult = htmlParser.parse(template.source, fileName, {
                tokenizeExpansionForms: true,
                preserveLineEndings: true,
            });
            var _a = this.getModuleMetadataForDirective(classSymbol), directives = _a.directives, pipes = _a.pipes, schemas = _a.schemas;
            var parseResult = parser.tryParseHtml(htmlResult, data.metadata, directives, pipes, schemas);
            if (!parseResult.templateAst) {
                return;
            }
            return {
                htmlAst: htmlResult.rootNodes,
                templateAst: parseResult.templateAst,
                directive: data.metadata,
                directives: directives,
                pipes: pipes,
                parseErrors: parseResult.errors,
                expressionParser: expressionParser,
                template: template,
            };
        };
        /**
         * Log the specified `msg` to file at INFO level. If logging is not enabled
         * this method is a no-op.
         * @param msg Log message
         */
        TypeScriptServiceHost.prototype.log = function (msg) {
            if (this.tsLsHost.log) {
                this.tsLsHost.log(msg);
            }
        };
        /**
         * Log the specified `msg` to file at ERROR level. If logging is not enabled
         * this method is a no-op.
         * @param msg error message
         */
        TypeScriptServiceHost.prototype.error = function (msg) {
            if (this.tsLsHost.error) {
                this.tsLsHost.error(msg);
            }
        };
        /**
         * Log debugging info to file at INFO level, only if verbose setting is turned
         * on. Otherwise, this method is a no-op.
         * @param msg debugging message
         */
        TypeScriptServiceHost.prototype.debug = function (msg) {
            var project = this.tsLsHost;
            if (!project.projectService) {
                // tsLsHost is not a Project
                return;
            }
            var logger = project.projectService.logger;
            if (logger.hasLevel(tss.server.LogLevel.verbose)) {
                logger.info(msg);
            }
        };
        return TypeScriptServiceHost;
    }());
    exports.TypeScriptServiceHost = TypeScriptServiceHost;
    function findSuitableDefaultModule(modules) {
        var e_8, _a;
        var result = undefined;
        var resultSize = 0;
        try {
            for (var _b = tslib_1.__values(modules.ngModules), _c = _b.next(); !_c.done; _c = _b.next()) {
                var module_1 = _c.value;
                var moduleSize = module_1.transitiveModule.directives.length;
                if (moduleSize > resultSize) {
                    result = module_1;
                    resultSize = moduleSize;
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return result;
    }
    function spanOf(node) {
        return { start: node.getStart(), end: node.getEnd() };
    }
    function spanAt(sourceFile, line, column) {
        if (line != null && column != null) {
            var position_1 = tss.getPositionOfLineAndCharacter(sourceFile, line, column);
            var findChild = function findChild(node) {
                if (node.kind > tss.SyntaxKind.LastToken && node.pos <= position_1 && node.end > position_1) {
                    var betterNode = tss.forEachChild(node, findChild);
                    return betterNode || node;
                }
            };
            var node = tss.forEachChild(sourceFile, findChild);
            if (node) {
                return { start: node.getStart(), end: node.getEnd() };
            }
        }
    }
    function convertChain(chain) {
        return { message: chain.message, next: chain.next ? chain.next.map(convertChain) : undefined };
    }
    function errorToDiagnosticWithChain(error, span) {
        return { message: error.chain ? convertChain(error.chain) : error.message, span: span };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2aUI7SUFDN2lCLHNDQUFxRjtJQUNyRixvREFBc0Q7SUFFdEQsbUZBQXlEO0lBQ3pELCtFQUErQztJQUMvQyxtRUFBNEQ7SUFFNUQsNkRBQStIO0lBRy9IOztPQUVHO0lBQ0gsU0FBZ0IsbUNBQW1DLENBQy9DLElBQTZCLEVBQUUsT0FBNEI7UUFDN0QsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBTSxRQUFRLEdBQUcsd0NBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0MsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUxELGtGQUtDO0lBRUQ7Ozs7O09BS0c7SUFDSDtRQUFxQywyQ0FBVTtRQUEvQzs7UUFJQSxDQUFDO1FBSEMsK0JBQUssR0FBTDtZQUNFLE9BQU8sSUFBSSwwQkFBZSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBQ0gsc0JBQUM7SUFBRCxDQUFDLEFBSkQsQ0FBcUMscUJBQVUsR0FJOUM7SUFKWSwwQ0FBZTtJQU01Qjs7T0FFRztJQUNIO1FBQXlDLCtDQUFjO1FBQXZEOztRQUlBLENBQUM7UUFIQyxpQ0FBRyxHQUFILFVBQUksSUFBWTtZQUNkLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBSkQsQ0FBeUMseUJBQWMsR0FJdEQ7SUFKWSxrREFBbUI7SUFNaEM7Ozs7Ozs7T0FPRztJQUNIO1FBaUJFLCtCQUNhLFFBQWlDLEVBQW1CLElB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LENBQUM7SUFDL0YsQ0FBQztJQUVELFNBQVMsMEJBQTBCLENBQUMsS0FBcUIsRUFBRSxJQUFVO1FBQ25FLE9BQU8sRUFBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLE1BQUEsRUFBQyxDQUFDO0lBQ2xGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7YW5hbHl6ZU5nTW9kdWxlcywgQW90U3VtbWFyeVJlc29sdmVyLCBDb21waWxlRGlyZWN0aXZlU3VtbWFyeSwgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIsIENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhLCBDb21waWxlUGlwZVN1bW1hcnksIENvbXBpbGVyQ29uZmlnLCBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyLCBEaXJlY3RpdmVOb3JtYWxpemVyLCBEaXJlY3RpdmVSZXNvbHZlciwgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBGb3JtYXR0ZWRFcnJvciwgRm9ybWF0dGVkTWVzc2FnZUNoYWluLCBIdG1sUGFyc2VyLCBpc0Zvcm1hdHRlZEVycm9yLCBKaXRTdW1tYXJ5UmVzb2x2ZXIsIExleGVyLCBOZ0FuYWx5emVkTW9kdWxlcywgTmdNb2R1bGVSZXNvbHZlciwgUGFyc2VyLCBQYXJzZVRyZWVSZXN1bHQsIFBpcGVSZXNvbHZlciwgUmVzb3VyY2VMb2FkZXIsIFN0YXRpY1JlZmxlY3RvciwgU3RhdGljU3ltYm9sLCBTdGF0aWNTeW1ib2xDYWNoZSwgU3RhdGljU3ltYm9sUmVzb2x2ZXIsIFRlbXBsYXRlUGFyc2VyfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge1NjaGVtYU1ldGFkYXRhLCBWaWV3RW5jYXBzdWxhdGlvbiwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7Y3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuaW1wb3J0IHtSZWZsZWN0b3JIb3N0fSBmcm9tICcuL3JlZmxlY3Rvcl9ob3N0JztcbmltcG9ydCB7RXh0ZXJuYWxUZW1wbGF0ZSwgSW5saW5lVGVtcGxhdGV9IGZyb20gJy4vdGVtcGxhdGUnO1xuaW1wb3J0IHtBc3RSZXN1bHQsIERlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkVycm9yLCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBMYW5ndWFnZVNlcnZpY2UsIExhbmd1YWdlU2VydmljZUhvc3QsIFNwYW4sIFRlbXBsYXRlU291cmNlfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZSwgZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AsIGdldERpcmVjdGl2ZUNsYXNzTGlrZSwgZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlfSBmcm9tICcuL3V0aWxzJztcblxuXG4vKipcbiAqIENyZWF0ZSBhIGBMYW5ndWFnZVNlcnZpY2VIb3N0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlRnJvbVR5cGVzY3JpcHQoXG4gICAgaG9zdDogdHNzLkxhbmd1YWdlU2VydmljZUhvc3QsIHNlcnZpY2U6IHRzcy5MYW5ndWFnZVNlcnZpY2UpOiBMYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdCBuZ0hvc3QgPSBuZXcgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KGhvc3QsIHNlcnZpY2UpO1xuICBjb25zdCBuZ1NlcnZlciA9IGNyZWF0ZUxhbmd1YWdlU2VydmljZShuZ0hvc3QpO1xuICByZXR1cm4gbmdTZXJ2ZXI7XG59XG5cbi8qKlxuICogVGhlIGxhbmd1YWdlIHNlcnZpY2UgbmV2ZXIgbmVlZHMgdGhlIG5vcm1hbGl6ZWQgdmVyc2lvbnMgb2YgdGhlIG1ldGFkYXRhLiBUbyBhdm9pZCBwYXJzaW5nXG4gKiB0aGUgY29udGVudCBhbmQgcmVzb2x2aW5nIHJlZmVyZW5jZXMsIHJldHVybiBhbiBlbXB0eSBmaWxlLiBUaGlzIGFsc28gYWxsb3dzIG5vcm1hbGl6aW5nXG4gKiB0ZW1wbGF0ZSB0aGF0IGFyZSBzeW50YXRpY2FsbHkgaW5jb3JyZWN0IHdoaWNoIGlzIHJlcXVpcmVkIHRvIHByb3ZpZGUgY29tcGxldGlvbnMgaW5cbiAqIHN5bnRhY3RpY2FsbHkgaW5jb3JyZWN0IHRlbXBsYXRlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIER1bW15SHRtbFBhcnNlciBleHRlbmRzIEh0bWxQYXJzZXIge1xuICBwYXJzZSgpOiBQYXJzZVRyZWVSZXN1bHQge1xuICAgIHJldHVybiBuZXcgUGFyc2VUcmVlUmVzdWx0KFtdLCBbXSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBdm9pZCBsb2FkaW5nIHJlc291cmNlcyBpbiB0aGUgbGFuZ3VhZ2Ugc2VydmNpZSBieSB1c2luZyBhIGR1bW15IGxvYWRlci5cbiAqL1xuZXhwb3J0IGNsYXNzIER1bW15UmVzb3VyY2VMb2FkZXIgZXh0ZW5kcyBSZXNvdXJjZUxvYWRlciB7XG4gIGdldChfdXJsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoJycpO1xuICB9XG59XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGAgZm9yIGEgVHlwZVNjcmlwdCBwcm9qZWN0LlxuICpcbiAqIFRoZSBgVHlwZVNjcmlwdFNlcnZpY2VIb3N0YCBpbXBsZW1lbnRzIHRoZSBBbmd1bGFyIGBMYW5ndWFnZVNlcnZpY2VIb3N0YCB1c2luZ1xuICogdGhlIFR5cGVTY3JpcHQgbGFuZ3VhZ2Ugc2VydmljZXMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdFNlcnZpY2VIb3N0IGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3VtbWFyeVJlc29sdmVyOiBBb3RTdW1tYXJ5UmVzb2x2ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVmbGVjdG9ySG9zdDogUmVmbGVjdG9ySG9zdDtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0aWNTeW1ib2xSZXNvbHZlcjogU3RhdGljU3ltYm9sUmVzb2x2ZXI7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0aWNTeW1ib2xDYWNoZSA9IG5ldyBTdGF0aWNTeW1ib2xDYWNoZSgpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVUb0NvbXBvbmVudCA9IG5ldyBNYXA8c3RyaW5nLCBTdGF0aWNTeW1ib2w+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29sbGVjdGVkRXJyb3JzID0gbmV3IE1hcDxzdHJpbmcsIGFueVtdPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVWZXJzaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgcHJpdmF0ZSBsYXN0UHJvZ3JhbTogdHNzLlByb2dyYW18dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMgPSB7XG4gICAgZmlsZXM6IFtdLFxuICAgIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgICBuZ01vZHVsZXM6IFtdLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgdHNMc0hvc3Q6IHRzcy5MYW5ndWFnZVNlcnZpY2VIb3N0LCBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzcy5MYW5ndWFnZVNlcnZpY2UpIHtcbiAgICB0aGlzLnN1bW1hcnlSZXNvbHZlciA9IG5ldyBBb3RTdW1tYXJ5UmVzb2x2ZXIoXG4gICAgICAgIHtcbiAgICAgICAgICBsb2FkU3VtbWFyeShfZmlsZVBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBpc1NvdXJjZUZpbGUoX3NvdXJjZUZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdG9TdW1tYXJ5RmlsZU5hbWUoc291cmNlRmlsZVBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZUZpbGVQYXRoO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZnJvbVN1bW1hcnlGaWxlTmFtZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aDtcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB0aGlzLnN0YXRpY1N5bWJvbENhY2hlKTtcbiAgICB0aGlzLnJlZmxlY3Rvckhvc3QgPSBuZXcgUmVmbGVjdG9ySG9zdCgoKSA9PiB0aGlzLnByb2dyYW0sIHRzTHNIb3N0KTtcbiAgICB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyID0gbmV3IFN0YXRpY1N5bWJvbFJlc29sdmVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rvckhvc3QsIHRoaXMuc3RhdGljU3ltYm9sQ2FjaGUsIHRoaXMuc3VtbWFyeVJlc29sdmVyLFxuICAgICAgICAoZSwgZmlsZVBhdGgpID0+IHRoaXMuY29sbGVjdEVycm9yKGUsIGZpbGVQYXRoKSk7XG4gIH1cblxuICAvLyBUaGUgcmVzb2x2ZXIgaXMgaW5zdGFudGlhdGVkIGxhemlseSBhbmQgc2hvdWxkIG5vdCBiZSBhY2Nlc3NlZCBkaXJlY3RseS5cbiAgLy8gSW5zdGVhZCwgY2FsbCB0aGUgcmVzb2x2ZXIgZ2V0dGVyLiBUaGUgaW5zdGFudGlhdGlvbiBvZiB0aGUgcmVzb2x2ZXIgYWxzb1xuICAvLyByZXF1aXJlcyBpbnN0YW50aWF0aW9uIG9mIHRoZSBTdGF0aWNSZWZsZWN0b3IsIGFuZCB0aGUgbGF0dGVyIHJlcXVpcmVzXG4gIC8vIHJlc29sdXRpb24gb2YgY29yZSBBbmd1bGFyIHN5bWJvbHMuIE1vZHVsZSByZXNvbHV0aW9uIHNob3VsZCBub3QgYmUgZG9uZVxuICAvLyBkdXJpbmcgaW5zdGFudGlhdGlvbiB0byBhdm9pZCBjeWNsaWMgZGVwZW5kZW5jeSBiZXR3ZWVuIHRoZSBwbHVnaW4gYW5kIHRoZVxuICAvLyBjb250YWluaW5nIFByb2plY3QsIHNvIHRoZSBTaW5nbGV0b24gcGF0dGVybiBpcyB1c2VkIGhlcmUuXG4gIHByaXZhdGUgX3Jlc29sdmVyOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlcnx1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgc2luZ2xldG9uIGluc3RhbmNlIG9mIHRoZSBNZXRhZGF0YVJlc29sdmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgcmVzb2x2ZXIoKTogQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIge1xuICAgIGlmICh0aGlzLl9yZXNvbHZlcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3Jlc29sdmVyO1xuICAgIH1cbiAgICAvLyBTdGF0aWNSZWZsZWN0b3Iga2VlcHMgaXRzIG93biBwcml2YXRlIGNhY2hlcyB0aGF0IGFyZSBub3QgY2xlYXJhYmxlLlxuICAgIC8vIFdlIGhhdmUgbm8gY2hvaWNlIGJ1dCB0byBjcmVhdGUgYSBuZXcgaW5zdGFuY2UgdG8gaW52YWxpZGF0ZSB0aGUgY2FjaGVzLlxuICAgIC8vIFRPRE86IFJldmlzaXQgdGhpcyB3aGVuIGxhbmd1YWdlIHNlcnZpY2UgZ2V0cyByZXdyaXR0ZW4gZm9yIEl2eS5cbiAgICBjb25zdCBzdGF0aWNSZWZsZWN0b3IgPSBuZXcgU3RhdGljUmVmbGVjdG9yKFxuICAgICAgICB0aGlzLnN1bW1hcnlSZXNvbHZlciwgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlcixcbiAgICAgICAgW10sICAvLyBrbm93bk1ldGFkYXRhQ2xhc3Nlc1xuICAgICAgICBbXSwgIC8vIGtub3duTWV0YWRhdGFGdW5jdGlvbnNcbiAgICAgICAgKGUsIGZpbGVQYXRoKSA9PiB0aGlzLmNvbGxlY3RFcnJvcihlLCBmaWxlUGF0aCkpO1xuICAgIC8vIEJlY2F1c2Ugc3RhdGljIHJlZmxlY3RvciBhYm92ZSBpcyBjaGFuZ2VkLCB3ZSBuZWVkIHRvIGNyZWF0ZSBhIG5ld1xuICAgIC8vIHJlc29sdmVyLlxuICAgIGNvbnN0IG1vZHVsZVJlc29sdmVyID0gbmV3IE5nTW9kdWxlUmVzb2x2ZXIoc3RhdGljUmVmbGVjdG9yKTtcbiAgICBjb25zdCBkaXJlY3RpdmVSZXNvbHZlciA9IG5ldyBEaXJlY3RpdmVSZXNvbHZlcihzdGF0aWNSZWZsZWN0b3IpO1xuICAgIGNvbnN0IHBpcGVSZXNvbHZlciA9IG5ldyBQaXBlUmVzb2x2ZXIoc3RhdGljUmVmbGVjdG9yKTtcbiAgICBjb25zdCBlbGVtZW50U2NoZW1hUmVnaXN0cnkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgcmVzb3VyY2VMb2FkZXIgPSBuZXcgRHVtbXlSZXNvdXJjZUxvYWRlcigpO1xuICAgIGNvbnN0IHVybFJlc29sdmVyID0gY3JlYXRlT2ZmbGluZUNvbXBpbGVVcmxSZXNvbHZlcigpO1xuICAgIGNvbnN0IGh0bWxQYXJzZXIgPSBuZXcgRHVtbXlIdG1sUGFyc2VyKCk7XG4gICAgLy8gVGhpcyB0cmFja3MgdGhlIENvbXBpbGVDb25maWcgaW4gY29kZWdlbi50cy4gQ3VycmVudGx5IHRoZXNlIG9wdGlvbnNcbiAgICAvLyBhcmUgaGFyZC1jb2RlZC5cbiAgICBjb25zdCBjb25maWcgPSBuZXcgQ29tcGlsZXJDb25maWcoe1xuICAgICAgZGVmYXVsdEVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLkVtdWxhdGVkLFxuICAgICAgdXNlSml0OiBmYWxzZSxcbiAgICB9KTtcbiAgICBjb25zdCBkaXJlY3RpdmVOb3JtYWxpemVyID1cbiAgICAgICAgbmV3IERpcmVjdGl2ZU5vcm1hbGl6ZXIocmVzb3VyY2VMb2FkZXIsIHVybFJlc29sdmVyLCBodG1sUGFyc2VyLCBjb25maWcpO1xuICAgIHRoaXMuX3Jlc29sdmVyID0gbmV3IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyKFxuICAgICAgICBjb25maWcsIGh0bWxQYXJzZXIsIG1vZHVsZVJlc29sdmVyLCBkaXJlY3RpdmVSZXNvbHZlciwgcGlwZVJlc29sdmVyLFxuICAgICAgICBuZXcgSml0U3VtbWFyeVJlc29sdmVyKCksIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgZGlyZWN0aXZlTm9ybWFsaXplciwgbmV3IENvbnNvbGUoKSxcbiAgICAgICAgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSwgc3RhdGljUmVmbGVjdG9yLFxuICAgICAgICAoZXJyb3IsIHR5cGUpID0+IHRoaXMuY29sbGVjdEVycm9yKGVycm9yLCB0eXBlICYmIHR5cGUuZmlsZVBhdGgpKTtcbiAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZXI7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBzaW5nbGV0b24gaW5zdGFuY2Ugb2YgdGhlIFN0YXRpY1JlZmxlY3RvciBob3N0ZWQgaW4gdGhlXG4gICAqIE1ldGFkYXRhUmVzb2x2ZXIuXG4gICAqL1xuICBwcml2YXRlIGdldCByZWZsZWN0b3IoKTogU3RhdGljUmVmbGVjdG9yIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5nZXRSZWZsZWN0b3IoKSBhcyBTdGF0aWNSZWZsZWN0b3I7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQgYW5kIHJldHVybnMgYWxsIGFuYWx5emVkIG1vZHVsZXMuXG4gICAqIElmIHByb2dyYW0gaGFzIGNoYW5nZWQsIGludmFsaWRhdGUgYWxsIGNhY2hlcyBhbmQgdXBkYXRlIGZpbGVUb0NvbXBvbmVudFxuICAgKiBhbmQgdGVtcGxhdGVSZWZlcmVuY2VzLlxuICAgKiBJbiBhZGRpdGlvbiB0byByZXR1cm5pbmcgaW5mb3JtYXRpb24gYWJvdXQgTmdNb2R1bGVzLCB0aGlzIG1ldGhvZCBwbGF5cyB0aGVcbiAgICogc2FtZSByb2xlIGFzICdzeW5jaHJvbml6ZUhvc3REYXRhJyBpbiB0c3NlcnZlci5cbiAgICovXG4gIGdldEFuYWx5emVkTW9kdWxlcygpOiBOZ0FuYWx5emVkTW9kdWxlcyB7XG4gICAgaWYgKHRoaXMudXBUb0RhdGUoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuYW5hbHl6ZWRNb2R1bGVzO1xuICAgIH1cblxuICAgIC8vIEludmFsaWRhdGUgY2FjaGVzXG4gICAgdGhpcy5maWxlVG9Db21wb25lbnQuY2xlYXIoKTtcbiAgICB0aGlzLmNvbGxlY3RlZEVycm9ycy5jbGVhcigpO1xuICAgIHRoaXMucmVzb2x2ZXIuY2xlYXJDYWNoZSgpO1xuXG4gICAgY29uc3QgYW5hbHl6ZUhvc3QgPSB7XG4gICAgICBpc1NvdXJjZUZpbGUoX2ZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfTtcbiAgICBjb25zdCBwcm9ncmFtRmlsZXMgPSB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpO1xuICAgIHRoaXMuYW5hbHl6ZWRNb2R1bGVzID1cbiAgICAgICAgYW5hbHl6ZU5nTW9kdWxlcyhwcm9ncmFtRmlsZXMsIGFuYWx5emVIb3N0LCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLCB0aGlzLnJlc29sdmVyKTtcblxuICAgIC8vIHVwZGF0ZSB0ZW1wbGF0ZSByZWZlcmVuY2VzIGFuZCBmaWxlVG9Db21wb25lbnRcbiAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICBmb3IgKGNvbnN0IG5nTW9kdWxlIG9mIHRoaXMuYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlcykge1xuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgbmdNb2R1bGUuZGVjbGFyZWREaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IHttZXRhZGF0YX0gPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUucmVmZXJlbmNlKSE7XG4gICAgICAgIGlmIChtZXRhZGF0YS5pc0NvbXBvbmVudCAmJiBtZXRhZGF0YS50ZW1wbGF0ZSAmJiBtZXRhZGF0YS50ZW1wbGF0ZS50ZW1wbGF0ZVVybCkge1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlTmFtZSA9IHVybFJlc29sdmVyLnJlc29sdmUoXG4gICAgICAgICAgICAgIHRoaXMucmVmbGVjdG9yLmNvbXBvbmVudE1vZHVsZVVybChkaXJlY3RpdmUucmVmZXJlbmNlKSxcbiAgICAgICAgICAgICAgbWV0YWRhdGEudGVtcGxhdGUudGVtcGxhdGVVcmwpO1xuICAgICAgICAgIHRoaXMuZmlsZVRvQ29tcG9uZW50LnNldCh0ZW1wbGF0ZU5hbWUsIGRpcmVjdGl2ZS5yZWZlcmVuY2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYW5hbHl6ZWRNb2R1bGVzO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBwcm9ncmFtIGhhcyBjaGFuZ2VkLCBhbmQgaW52YWxpZGF0ZSBzdGF0aWMgc3ltYm9scyBpblxuICAgKiB0aGUgc291cmNlIGZpbGVzIHRoYXQgaGF2ZSBjaGFuZ2VkLlxuICAgKiBSZXR1cm5zIHRydWUgaWYgbW9kdWxlcyBhcmUgdXAtdG8tZGF0ZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBUaGlzIHNob3VsZCBvbmx5IGJlIGNhbGxlZCBieSBnZXRBbmFseXplZE1vZHVsZXMoKS5cbiAgICovXG4gIHByaXZhdGUgdXBUb0RhdGUoKTogYm9vbGVhbiB7XG4gICAgY29uc3Qge2xhc3RQcm9ncmFtLCBwcm9ncmFtfSA9IHRoaXM7XG4gICAgaWYgKGxhc3RQcm9ncmFtID09PSBwcm9ncmFtKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5sYXN0UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICAvLyBFdmVuIHRob3VnaCB0aGUgcHJvZ3JhbSBoYXMgY2hhbmdlZCwgaXQgY291bGQgYmUgdGhlIGNhc2UgdGhhdCBub25lIG9mXG4gICAgLy8gdGhlIHNvdXJjZSBmaWxlcyBoYXZlIGNoYW5nZWQuIElmIGFsbCBzb3VyY2UgZmlsZXMgcmVtYWluIHRoZSBzYW1lLCB0aGVuXG4gICAgLy8gcHJvZ3JhbSBpcyBzdGlsbCB1cC10by1kYXRlLCBhbmQgd2Ugc2hvdWxkIG5vdCBpbnZhbGlkYXRlIGNhY2hlcy5cbiAgICBsZXQgZmlsZXNBZGRlZCA9IDA7XG4gICAgY29uc3QgZmlsZXNDaGFuZ2VkT3JSZW1vdmVkOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgLy8gQ2hlY2sgaWYgYW55IHNvdXJjZSBmaWxlcyBoYXZlIGJlZW4gYWRkZWQgLyBjaGFuZ2VkIHNpbmNlIGxhc3QgY29tcHV0YXRpb24uXG4gICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3Qge2ZpbGVOYW1lfSBvZiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIHNlZW4uYWRkKGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IHZlcnNpb24gPSB0aGlzLnRzTHNIb3N0LmdldFNjcmlwdFZlcnNpb24oZmlsZU5hbWUpO1xuICAgICAgY29uc3QgbGFzdFZlcnNpb24gPSB0aGlzLmZpbGVWZXJzaW9ucy5nZXQoZmlsZU5hbWUpO1xuICAgICAgaWYgKGxhc3RWZXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZmlsZXNBZGRlZCsrO1xuICAgICAgICB0aGlzLmZpbGVWZXJzaW9ucy5zZXQoZmlsZU5hbWUsIHZlcnNpb24pO1xuICAgICAgfSBlbHNlIGlmICh2ZXJzaW9uICE9PSBsYXN0VmVyc2lvbikge1xuICAgICAgICBmaWxlc0NoYW5nZWRPclJlbW92ZWQucHVzaChmaWxlTmFtZSk7ICAvLyBjaGFuZ2VkXG4gICAgICAgIHRoaXMuZmlsZVZlcnNpb25zLnNldChmaWxlTmFtZSwgdmVyc2lvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgYW55IHNvdXJjZSBmaWxlcyBoYXZlIGJlZW4gcmVtb3ZlZCBzaW5jZSBsYXN0IGNvbXB1dGF0aW9uLlxuICAgIGZvciAoY29uc3QgW2ZpbGVOYW1lXSBvZiB0aGlzLmZpbGVWZXJzaW9ucykge1xuICAgICAgaWYgKCFzZWVuLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgICAgZmlsZXNDaGFuZ2VkT3JSZW1vdmVkLnB1c2goZmlsZU5hbWUpOyAgLy8gcmVtb3ZlZFxuICAgICAgICAvLyBCZWNhdXNlIE1hcHMgYXJlIGl0ZXJhdGVkIGluIGluc2VydGlvbiBvcmRlciwgaXQgaXMgc2FmZSB0byBkZWxldGVcbiAgICAgICAgLy8gZW50cmllcyBmcm9tIHRoZSBzYW1lIG1hcCB3aGlsZSBpdGVyYXRpbmcuXG4gICAgICAgIC8vIFNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTk0MDIxNiBhbmRcbiAgICAgICAgLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi8xMC4wL2luZGV4Lmh0bWwjc2VjLW1hcC5wcm90b3R5cGUuZm9yZWFjaFxuICAgICAgICB0aGlzLmZpbGVWZXJzaW9ucy5kZWxldGUoZmlsZU5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgZmlsZU5hbWUgb2YgZmlsZXNDaGFuZ2VkT3JSZW1vdmVkKSB7XG4gICAgICBjb25zdCBzeW1ib2xzID0gdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlci5pbnZhbGlkYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgICB0aGlzLnJlZmxlY3Rvci5pbnZhbGlkYXRlU3ltYm9scyhzeW1ib2xzKTtcbiAgICB9XG5cbiAgICAvLyBQcm9ncmFtIGlzIHVwLXRvLWRhdGUgaWZmIG5vIGZpbGVzIGFyZSBhZGRlZCwgY2hhbmdlZCwgb3IgcmVtb3ZlZC5cbiAgICByZXR1cm4gZmlsZXNBZGRlZCA9PT0gMCAmJiBmaWxlc0NoYW5nZWRPclJlbW92ZWQubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRlbXBsYXRlcyBpbiB0aGUgc3BlY2lmaWVkIGBmaWxlYC5cbiAgICogQHBhcmFtIGZpbGVOYW1lIFRTIG9yIEhUTUwgZmlsZVxuICAgKi9cbiAgZ2V0VGVtcGxhdGVzKGZpbGVOYW1lOiBzdHJpbmcpOiBUZW1wbGF0ZVNvdXJjZVtdIHtcbiAgICBjb25zdCByZXN1bHRzOiBUZW1wbGF0ZVNvdXJjZVtdID0gW107XG4gICAgaWYgKGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgLy8gRmluZCBldmVyeSB0ZW1wbGF0ZSBzdHJpbmcgaW4gdGhlIGZpbGVcbiAgICAgIGNvbnN0IHZpc2l0ID0gKGNoaWxkOiB0c3MuTm9kZSkgPT4ge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZ2V0SW50ZXJuYWxUZW1wbGF0ZShjaGlsZCk7XG4gICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgIHJlc3VsdHMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHNzLmZvckVhY2hDaGlsZChjaGlsZCwgdmlzaXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICB0c3MuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIHZpc2l0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmdldEV4dGVybmFsVGVtcGxhdGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHJlc3VsdHMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBtZXRhZGF0YSBhYm91dCBhbGwgY2xhc3MgZGVjbGFyYXRpb25zIGluIHRoZSBmaWxlIHRoYXQgYXJlIEFuZ3VsYXJcbiAgICogZGlyZWN0aXZlcy4gUG90ZW50aWFsIG1hdGNoZXMgYXJlIGBATmdNb2R1bGVgLCBgQENvbXBvbmVudGAsIGBARGlyZWN0aXZlYCxcbiAgICogYEBQaXBlc2AsIGV0Yy4gY2xhc3MgZGVjbGFyYXRpb25zLlxuICAgKlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgZmlsZVxuICAgKi9cbiAgZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lOiBzdHJpbmcpOiBEZWNsYXJhdGlvbltdIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICBpZiAoIXNvdXJjZUZpbGUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0czogRGVjbGFyYXRpb25bXSA9IFtdO1xuICAgIGNvbnN0IHZpc2l0ID0gKGNoaWxkOiB0c3MuTm9kZSkgPT4ge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gZ2V0RGlyZWN0aXZlQ2xhc3NMaWtlKGNoaWxkKTtcbiAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgY29uc3Qge2NsYXNzSWR9ID0gY2FuZGlkYXRlO1xuICAgICAgICBjb25zdCBkZWNsYXJhdGlvblNwYW4gPSBzcGFuT2YoY2xhc3NJZCk7XG4gICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IGNsYXNzSWQuZ2V0VGV4dCgpO1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMucmVmbGVjdG9yLmdldFN0YXRpY1N5bWJvbChzb3VyY2VGaWxlLmZpbGVOYW1lLCBjbGFzc05hbWUpO1xuICAgICAgICAvLyBBc2sgdGhlIHJlc29sdmVyIHRvIGNoZWNrIGlmIGNhbmRpZGF0ZSBpcyBhY3R1YWxseSBBbmd1bGFyIGRpcmVjdGl2ZVxuICAgICAgICBpZiAoIXRoaXMucmVzb2x2ZXIuaXNEaXJlY3RpdmUoY2xhc3NTeW1ib2wpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShjbGFzc1N5bWJvbCk7XG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6IGNsYXNzU3ltYm9sLFxuICAgICAgICAgIGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgICBtZXRhZGF0YTogZGF0YS5tZXRhZGF0YSxcbiAgICAgICAgICBlcnJvcnM6IHRoaXMuZ2V0Q29sbGVjdGVkRXJyb3JzKGRlY2xhcmF0aW9uU3Bhbiwgc291cmNlRmlsZSksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQuZm9yRWFjaENoaWxkKHZpc2l0KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHRzcy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgdmlzaXQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiB0c3MuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGlmICghZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi1UUyBzb3VyY2UgZmlsZSByZXF1ZXN0ZWQ6ICR7ZmlsZU5hbWV9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gIH1cblxuICBnZXQgcHJvZ3JhbSgpOiB0c3MuUHJvZ3JhbSB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMudHNMUy5nZXRQcm9ncmFtKCk7XG4gICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAvLyBQcm9ncmFtIGlzIHZlcnkgdmVyeSB1bmxpa2VseSB0byBiZSB1bmRlZmluZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHByb2dyYW0gaW4gbGFuZ3VhZ2Ugc2VydmljZSEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBUZW1wbGF0ZVNvdXJjZSBpZiBgbm9kZWAgaXMgYSB0ZW1wbGF0ZSBub2RlLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSxcbiAgICpcbiAgICogQENvbXBvbmVudCh7XG4gICAqICAgdGVtcGxhdGU6ICc8ZGl2PjwvZGl2PicgPC0tIHRlbXBsYXRlIG5vZGVcbiAgICogfSlcbiAgICogY2xhc3MgQXBwQ29tcG9uZW50IHt9XG4gICAqICAgICAgICAgICBeLS0tLSBjbGFzcyBkZWNsYXJhdGlvbiBub2RlXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIFBvdGVudGlhbCB0ZW1wbGF0ZSBub2RlXG4gICAqL1xuICBwcml2YXRlIGdldEludGVybmFsVGVtcGxhdGUobm9kZTogdHNzLk5vZGUpOiBUZW1wbGF0ZVNvdXJjZXx1bmRlZmluZWQge1xuICAgIGlmICghdHNzLmlzU3RyaW5nTGl0ZXJhbExpa2Uobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdG1wbEFzZ24gPSBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWUobm9kZSk7XG4gICAgaWYgKCF0bXBsQXNnbiB8fCB0bXBsQXNnbi5uYW1lLmdldFRleHQoKSAhPT0gJ3RlbXBsYXRlJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjbGFzc0RlY2wgPSBnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcCh0bXBsQXNnbik7XG4gICAgaWYgKCFjbGFzc0RlY2wgfHwgIWNsYXNzRGVjbC5uYW1lKSB7ICAvLyBEb2VzIG5vdCBoYW5kbGUgYW5vbnltb3VzIGNsYXNzXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZpbGVOYW1lID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLnJlZmxlY3Rvci5nZXRTdGF0aWNTeW1ib2woZmlsZU5hbWUsIGNsYXNzRGVjbC5uYW1lLnRleHQpO1xuICAgIHJldHVybiBuZXcgSW5saW5lVGVtcGxhdGUobm9kZSwgY2xhc3NEZWNsLCBjbGFzc1N5bWJvbCwgdGhpcyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBleHRlcm5hbCB0ZW1wbGF0ZSBmb3IgYGZpbGVOYW1lYC5cbiAgICogQHBhcmFtIGZpbGVOYW1lIEhUTUwgZmlsZVxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFeHRlcm5hbFRlbXBsYXRlKGZpbGVOYW1lOiBzdHJpbmcpOiBUZW1wbGF0ZVNvdXJjZXx1bmRlZmluZWQge1xuICAgIC8vIEZpcnN0IGdldCB0aGUgdGV4dCBmb3IgdGhlIHRlbXBsYXRlXG4gICAgY29uc3Qgc25hcHNob3QgPSB0aGlzLnRzTHNIb3N0LmdldFNjcmlwdFNuYXBzaG90KGZpbGVOYW1lKTtcbiAgICBpZiAoIXNuYXBzaG90KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IHNuYXBzaG90LmdldFRleHQoMCwgc25hcHNob3QuZ2V0TGVuZ3RoKCkpO1xuICAgIC8vIE5leHQgZmluZCB0aGUgY29tcG9uZW50IGNsYXNzIHN5bWJvbFxuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5maWxlVG9Db21wb25lbnQuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRoZW4gdXNlIHRoZSBjbGFzcyBzeW1ib2wgdG8gZmluZCB0aGUgYWN0dWFsIHRzLkNsYXNzRGVjbGFyYXRpb24gbm9kZVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoY2xhc3NTeW1ib2wuZmlsZVBhdGgpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUT0RPOiBUaGlzIG9ubHkgY29uc2lkZXJzIHRvcC1sZXZlbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gYSBzb3VyY2UgZmlsZS5cbiAgICAvLyBUaGlzIHdvdWxkIG5vdCBmaW5kIGEgY2xhc3MgZGVjbGFyYXRpb24gaW4gYSBuYW1lc3BhY2UsIGZvciBleGFtcGxlLlxuICAgIGNvbnN0IGNsYXNzRGVjbCA9IHNvdXJjZUZpbGUuZm9yRWFjaENoaWxkKChjaGlsZCkgPT4ge1xuICAgICAgaWYgKHRzcy5pc0NsYXNzRGVjbGFyYXRpb24oY2hpbGQpICYmIGNoaWxkLm5hbWUgJiYgY2hpbGQubmFtZS50ZXh0ID09PSBjbGFzc1N5bWJvbC5uYW1lKSB7XG4gICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWNsYXNzRGVjbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEV4dGVybmFsVGVtcGxhdGUoc291cmNlLCBmaWxlTmFtZSwgY2xhc3NEZWNsLCBjbGFzc1N5bWJvbCwgdGhpcyk7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RFcnJvcihlcnJvcjogYW55LCBmaWxlUGF0aD86IHN0cmluZykge1xuICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgbGV0IGVycm9ycyA9IHRoaXMuY29sbGVjdGVkRXJyb3JzLmdldChmaWxlUGF0aCk7XG4gICAgICBpZiAoIWVycm9ycykge1xuICAgICAgICBlcnJvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5jb2xsZWN0ZWRFcnJvcnMuc2V0KGZpbGVQYXRoLCBlcnJvcnMpO1xuICAgICAgfVxuICAgICAgZXJyb3JzLnB1c2goZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29sbGVjdGVkRXJyb3JzKGRlZmF1bHRTcGFuOiBTcGFuLCBzb3VyY2VGaWxlOiB0c3MuU291cmNlRmlsZSk6IERlY2xhcmF0aW9uRXJyb3JbXSB7XG4gICAgY29uc3QgZXJyb3JzID0gdGhpcy5jb2xsZWN0ZWRFcnJvcnMuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgIGlmICghZXJyb3JzKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIC8vIFRPRE86IEFkZCBiZXR0ZXIgdHlwaW5ncyBmb3IgdGhlIGVycm9yc1xuICAgIHJldHVybiBlcnJvcnMubWFwKChlOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGxpbmUgPSBlLmxpbmUgfHwgKGUucG9zaXRpb24gJiYgZS5wb3NpdGlvbi5saW5lKTtcbiAgICAgIGNvbnN0IGNvbHVtbiA9IGUuY29sdW1uIHx8IChlLnBvc2l0aW9uICYmIGUucG9zaXRpb24uY29sdW1uKTtcbiAgICAgIGNvbnN0IHNwYW4gPSBzcGFuQXQoc291cmNlRmlsZSwgbGluZSwgY29sdW1uKSB8fCBkZWZhdWx0U3BhbjtcbiAgICAgIGlmIChpc0Zvcm1hdHRlZEVycm9yKGUpKSB7XG4gICAgICAgIHJldHVybiBlcnJvclRvRGlhZ25vc3RpY1dpdGhDaGFpbihlLCBzcGFuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7bWVzc2FnZTogZS5tZXNzYWdlLCBzcGFufTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHBhcnNlZCB0ZW1wbGF0ZSBmb3IgdGhlIHRlbXBsYXRlIGF0IHRoZSBzcGVjaWZpZWQgYHBvc2l0aW9uYC5cbiAgICogQHBhcmFtIGZpbGVOYW1lIFRTIG9yIEhUTUwgZmlsZVxuICAgKiBAcGFyYW0gcG9zaXRpb24gUG9zaXRpb24gb2YgdGhlIHRlbXBsYXRlIGluIHRoZSBUUyBmaWxlLCBvdGhlcndpc2UgaWdub3JlZC5cbiAgICovXG4gIGdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogQXN0UmVzdWx0fHVuZGVmaW5lZCB7XG4gICAgbGV0IHRlbXBsYXRlOiBUZW1wbGF0ZVNvdXJjZXx1bmRlZmluZWQ7XG4gICAgaWYgKGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoIXNvdXJjZUZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gRmluZCB0aGUgbm9kZSB0aGF0IG1vc3QgY2xvc2VseSBtYXRjaGVzIHRoZSBwb3NpdGlvblxuICAgICAgY29uc3Qgbm9kZSA9IGZpbmRUaWdodGVzdE5vZGUoc291cmNlRmlsZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRlbXBsYXRlID0gdGhpcy5nZXRJbnRlcm5hbFRlbXBsYXRlKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMuZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZSk7XG4gICAgfVxuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIE5nTW9kdWxlIHdoaWNoIHRoZSBkaXJlY3RpdmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBgY2xhc3NTeW1ib2xgXG4gICAqIGJlbG9uZ3MgdG8sIHRoZW4gcmV0dXJuIGl0cyBzY2hlbWEgYW5kIHRyYW5zaXRpdmUgZGlyZWN0aXZlcyBhbmQgcGlwZXMuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCBBbmd1bGFyIFN5bWJvbCB0aGF0IGRlZmluZXMgYSBkaXJlY3RpdmVcbiAgICovXG4gIHByaXZhdGUgZ2V0TW9kdWxlTWV0YWRhdGFGb3JEaXJlY3RpdmUoY2xhc3NTeW1ib2w6IFN0YXRpY1N5bWJvbCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IFtdIGFzIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5W10sXG4gICAgICBwaXBlczogW10gYXMgQ29tcGlsZVBpcGVTdW1tYXJ5W10sXG4gICAgICBzY2hlbWFzOiBbXSBhcyBTY2hlbWFNZXRhZGF0YVtdLFxuICAgIH07XG4gICAgLy8gRmlyc3QgZmluZCB3aGljaCBOZ01vZHVsZSB0aGUgZGlyZWN0aXZlIGJlbG9uZ3MgdG8uXG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmdldChjbGFzc1N5bWJvbCkgfHxcbiAgICAgICAgZmluZFN1aXRhYmxlRGVmYXVsdE1vZHVsZSh0aGlzLmFuYWx5emVkTW9kdWxlcyk7XG4gICAgaWYgKCFuZ01vZHVsZSkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgLy8gVGhlbiBnYXRoZXIgYWxsIHRyYW5zaXRpdmUgZGlyZWN0aXZlcyBhbmQgcGlwZXMuXG4gICAgY29uc3Qge2RpcmVjdGl2ZXMsIHBpcGVzfSA9IG5nTW9kdWxlLnRyYW5zaXRpdmVNb2R1bGU7XG4gICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgZGlyZWN0aXZlcykge1xuICAgICAgY29uc3QgZGF0YSA9IHRoaXMucmVzb2x2ZXIuZ2V0Tm9uTm9ybWFsaXplZERpcmVjdGl2ZU1ldGFkYXRhKGRpcmVjdGl2ZS5yZWZlcmVuY2UpO1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgcmVzdWx0LmRpcmVjdGl2ZXMucHVzaChkYXRhLm1ldGFkYXRhLnRvU3VtbWFyeSgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBwaXBlIG9mIHBpcGVzKSB7XG4gICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMucmVzb2x2ZXIuZ2V0T3JMb2FkUGlwZU1ldGFkYXRhKHBpcGUucmVmZXJlbmNlKTtcbiAgICAgIHJlc3VsdC5waXBlcy5wdXNoKG1ldGFkYXRhLnRvU3VtbWFyeSgpKTtcbiAgICB9XG4gICAgcmVzdWx0LnNjaGVtYXMucHVzaCguLi5uZ01vZHVsZS5zY2hlbWFzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIHRoZSBgdGVtcGxhdGVgIGFuZCByZXR1cm4gaXRzIEFTVCwgaWYgYW55LlxuICAgKiBAcGFyYW0gdGVtcGxhdGUgdGVtcGxhdGUgdG8gYmUgcGFyc2VkXG4gICAqL1xuICBnZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2UpOiBBc3RSZXN1bHR8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB7dHlwZTogY2xhc3NTeW1ib2wsIGZpbGVOYW1lfSA9IHRlbXBsYXRlO1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShjbGFzc1N5bWJvbCk7XG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGh0bWxQYXJzZXIgPSBuZXcgSHRtbFBhcnNlcigpO1xuICAgIGNvbnN0IGV4cHJlc3Npb25QYXJzZXIgPSBuZXcgUGFyc2VyKG5ldyBMZXhlcigpKTtcbiAgICBjb25zdCBwYXJzZXIgPSBuZXcgVGVtcGxhdGVQYXJzZXIoXG4gICAgICAgIG5ldyBDb21waWxlckNvbmZpZygpLCB0aGlzLnJlZmxlY3RvciwgZXhwcmVzc2lvblBhcnNlciwgbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpLFxuICAgICAgICBodG1sUGFyc2VyLFxuICAgICAgICBudWxsISwgIC8vIGNvbnNvbGVcbiAgICAgICAgW10gICAgICAvLyB0cmFuZm9ybXNcbiAgICApO1xuICAgIGNvbnN0IGh0bWxSZXN1bHQgPSBodG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLnNvdXJjZSwgZmlsZU5hbWUsIHtcbiAgICAgIHRva2VuaXplRXhwYW5zaW9uRm9ybXM6IHRydWUsXG4gICAgICBwcmVzZXJ2ZUxpbmVFbmRpbmdzOiB0cnVlLCAgLy8gZG8gbm90IGNvbnZlcnQgQ1JMRiB0byBMRlxuICAgIH0pO1xuICAgIGNvbnN0IHtkaXJlY3RpdmVzLCBwaXBlcywgc2NoZW1hc30gPSB0aGlzLmdldE1vZHVsZU1ldGFkYXRhRm9yRGlyZWN0aXZlKGNsYXNzU3ltYm9sKTtcbiAgICBjb25zdCBwYXJzZVJlc3VsdCA9IHBhcnNlci50cnlQYXJzZUh0bWwoaHRtbFJlc3VsdCwgZGF0YS5tZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsIHNjaGVtYXMpO1xuICAgIGlmICghcGFyc2VSZXN1bHQudGVtcGxhdGVBc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGh0bWxBc3Q6IGh0bWxSZXN1bHQucm9vdE5vZGVzLFxuICAgICAgdGVtcGxhdGVBc3Q6IHBhcnNlUmVzdWx0LnRlbXBsYXRlQXN0LFxuICAgICAgZGlyZWN0aXZlOiBkYXRhLm1ldGFkYXRhLFxuICAgICAgZGlyZWN0aXZlcyxcbiAgICAgIHBpcGVzLFxuICAgICAgcGFyc2VFcnJvcnM6IHBhcnNlUmVzdWx0LmVycm9ycyxcbiAgICAgIGV4cHJlc3Npb25QYXJzZXIsXG4gICAgICB0ZW1wbGF0ZSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIExvZyB0aGUgc3BlY2lmaWVkIGBtc2dgIHRvIGZpbGUgYXQgSU5GTyBsZXZlbC4gSWYgbG9nZ2luZyBpcyBub3QgZW5hYmxlZFxuICAgKiB0aGlzIG1ldGhvZCBpcyBhIG5vLW9wLlxuICAgKiBAcGFyYW0gbXNnIExvZyBtZXNzYWdlXG4gICAqL1xuICBsb2cobXNnOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy50c0xzSG9zdC5sb2cpIHtcbiAgICAgIHRoaXMudHNMc0hvc3QubG9nKG1zZyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvZyB0aGUgc3BlY2lmaWVkIGBtc2dgIHRvIGZpbGUgYXQgRVJST1IgbGV2ZWwuIElmIGxvZ2dpbmcgaXMgbm90IGVuYWJsZWRcbiAgICogdGhpcyBtZXRob2QgaXMgYSBuby1vcC5cbiAgICogQHBhcmFtIG1zZyBlcnJvciBtZXNzYWdlXG4gICAqL1xuICBlcnJvcihtc2c6IHN0cmluZykge1xuICAgIGlmICh0aGlzLnRzTHNIb3N0LmVycm9yKSB7XG4gICAgICB0aGlzLnRzTHNIb3N0LmVycm9yKG1zZyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvZyBkZWJ1Z2dpbmcgaW5mbyB0byBmaWxlIGF0IElORk8gbGV2ZWwsIG9ubHkgaWYgdmVyYm9zZSBzZXR0aW5nIGlzIHR1cm5lZFxuICAgKiBvbi4gT3RoZXJ3aXNlLCB0aGlzIG1ldGhvZCBpcyBhIG5vLW9wLlxuICAgKiBAcGFyYW0gbXNnIGRlYnVnZ2luZyBtZXNzYWdlXG4gICAqL1xuICBkZWJ1Zyhtc2c6IHN0cmluZykge1xuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLnRzTHNIb3N0IGFzIHRzcy5zZXJ2ZXIuUHJvamVjdDtcbiAgICBpZiAoIXByb2plY3QucHJvamVjdFNlcnZpY2UpIHtcbiAgICAgIC8vIHRzTHNIb3N0IGlzIG5vdCBhIFByb2plY3RcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge2xvZ2dlcn0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGlmIChsb2dnZXIuaGFzTGV2ZWwodHNzLnNlcnZlci5Mb2dMZXZlbC52ZXJib3NlKSkge1xuICAgICAgbG9nZ2VyLmluZm8obXNnKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFN1aXRhYmxlRGVmYXVsdE1vZHVsZShtb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyk6IENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZCB7XG4gIGxldCByZXN1bHQ6IENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgbGV0IHJlc3VsdFNpemUgPSAwO1xuICBmb3IgKGNvbnN0IG1vZHVsZSBvZiBtb2R1bGVzLm5nTW9kdWxlcykge1xuICAgIGNvbnN0IG1vZHVsZVNpemUgPSBtb2R1bGUudHJhbnNpdGl2ZU1vZHVsZS5kaXJlY3RpdmVzLmxlbmd0aDtcbiAgICBpZiAobW9kdWxlU2l6ZSA+IHJlc3VsdFNpemUpIHtcbiAgICAgIHJlc3VsdCA9IG1vZHVsZTtcbiAgICAgIHJlc3VsdFNpemUgPSBtb2R1bGVTaXplO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzcGFuT2Yobm9kZTogdHNzLk5vZGUpOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xufVxuXG5mdW5jdGlvbiBzcGFuQXQoc291cmNlRmlsZTogdHNzLlNvdXJjZUZpbGUsIGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gIGlmIChsaW5lICE9IG51bGwgJiYgY29sdW1uICE9IG51bGwpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRzcy5nZXRQb3NpdGlvbk9mTGluZUFuZENoYXJhY3Rlcihzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pO1xuICAgIGNvbnN0IGZpbmRDaGlsZCA9IGZ1bmN0aW9uIGZpbmRDaGlsZChub2RlOiB0c3MuTm9kZSk6IHRzcy5Ob2RlfHVuZGVmaW5lZCB7XG4gICAgICBpZiAobm9kZS5raW5kID4gdHNzLlN5bnRheEtpbmQuTGFzdFRva2VuICYmIG5vZGUucG9zIDw9IHBvc2l0aW9uICYmIG5vZGUuZW5kID4gcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgYmV0dGVyTm9kZSA9IHRzcy5mb3JFYWNoQ2hpbGQobm9kZSwgZmluZENoaWxkKTtcbiAgICAgICAgcmV0dXJuIGJldHRlck5vZGUgfHwgbm9kZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgbm9kZSA9IHRzcy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgZmluZENoaWxkKTtcbiAgICBpZiAobm9kZSkge1xuICAgICAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0Q2hhaW4oY2hhaW46IEZvcm1hdHRlZE1lc3NhZ2VDaGFpbik6IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICByZXR1cm4ge21lc3NhZ2U6IGNoYWluLm1lc3NhZ2UsIG5leHQ6IGNoYWluLm5leHQgPyBjaGFpbi5uZXh0Lm1hcChjb252ZXJ0Q2hhaW4pIDogdW5kZWZpbmVkfTtcbn1cblxuZnVuY3Rpb24gZXJyb3JUb0RpYWdub3N0aWNXaXRoQ2hhaW4oZXJyb3I6IEZvcm1hdHRlZEVycm9yLCBzcGFuOiBTcGFuKTogRGVjbGFyYXRpb25FcnJvciB7XG4gIHJldHVybiB7bWVzc2FnZTogZXJyb3IuY2hhaW4gPyBjb252ZXJ0Q2hhaW4oZXJyb3IuY2hhaW4pIDogZXJyb3IubWVzc2FnZSwgc3Bhbn07XG59XG4iXX0=
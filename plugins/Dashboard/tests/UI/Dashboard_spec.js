/*!
 * Piwik - free/libre analytics platform
 *
 * Dashboard screenshot tests.
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("Dashboard", function () {
    this.timeout(0);

    var url = "?module=Widgetize&action=iframe&idSite=1&period=year&date=2012-08-09&moduleToWidgetize=Dashboard&"
            + "actionToWidgetize=index&idDashboard=5";

    var removeAllExtraDashboards = async function() {
        testEnvironment.callController("Dashboard.getAllDashboards", {}, function (err, dashboards) {
            dashboards = (dashboards || []).filter(function (dash) {
                return parseInt(dash.iddashboard) > 5;
            });

            var removeDashboard = function (i) {
                if (i >= dashboards.length) {
                    done();
                    return;
                }

                console.log("Removing dashboard ID = " + dashboards[i].iddashboard);
                testEnvironment.callApi("Dashboard.removeDashboard", {idDashboard: dashboards[i].iddashboard}, function () {
                    removeDashboard(i + 1);
                });
            };

            removeDashboard(0);
        });
    };

    var setup = async function() {
        // make sure live widget doesn't refresh constantly for UI tests
        testEnvironment.overrideConfig('General', 'live_widget_refresh_after_seconds', 1000000);
        testEnvironment.save();

        // save empty layout for dashboard ID = 5
        var layout = [
            [
                {
                    uniqueId: "widgetVisitsSummarygetEvolutionGraphforceView1viewDataTablegraphEvolution",
                    parameters: {module: "VisitsSummary", action: "getEvolutionGraph", columns: "nb_visits"}
                }
            ],
            [],
            []
        ];

        await testEnvironment.callController("Dashboard.saveLayout", {name: 'D4', layout: JSON.stringify(layout), idDashboard: 5, idSite: 2});
        await testEnvironment.callController("Dashboard.saveLayoutAsDefault", {layout: 0});
        await removeAllExtraDashboards();
    };

    before(setup);
    after(setup);

    it("should load correctly", async function() {
        await page.goto(url);
        await page.waitForNetworkIdle();

        expect(await page.screenshot({ fullPage: true })).to.matchImage('loaded');
    });

    it("should move a widget when widget is drag & dropped", async function() {
        var widget = await page.$('.widgetTop');
        await widget.hover();
        await page.mouse.down();

        var col2 = await page.jQuery('#dashboardWidgetsArea > .col:eq(2)');
        await col2.hover();
        await page.mouse.up();

        expect(await page.screenshot({ fullPage: true })).to.matchImage('widget_move');
    });

    it("should refresh widget when widget refresh icon clicked", async function() {
        var widget = await page.$('.widgetTop');
        await widget.hover();

        await page.click('.button#refresh');

        await page.waitForNetworkIdle();

        // page.mouseMove('.dashboard-manager'); // let widget top hide again

        expect(await page.screenshot({ fullPage: true })).to.matchImage('widget_move_refresh');
    });

    it("should minimise widget when widget minimise icon clicked", async function() {
        var widget = await page.$('.widgetTop');
        await widget.hover();
        await page.click('.button#minimise');

        expect(await page.screenshot({ fullPage: true })).to.matchImage('widget_minimised');
    });

    it("should unminimise widget when widget maximise icon is clicked after being minimised", async function() {
        var widget = await page.$('.widgetTop');
        await widget.hover();
        await page.click('.button#maximise');

        // page.mouseMove('.dashboard-manager'); // let widget top hide again

        expect(await page.screenshot({ fullPage: true })).to.matchImage('widget_move_unminimised');
    });

    it("should maximise widget when widget maximise icon is clicked", async function() {
        var widget = await page.$('.widgetTop');
        await widget.hover();
        await page.click('.button#maximise');

        expect(await page.screenshot({ fullPage: true })).to.matchImage('widget_maximise');
    });

    it("should close maximise dialog when minimise icon is clicked", async function() {
        var widget = await page.$('.widgetTop');
        await widget.hover();
        await page.click('.button#minimise');

        // page.mouseMove('.dashboard-manager'); // let widget top hide again

        expect(await page.screenshot({ fullPage: true })).to.matchImage('widget_move_unmaximise');
    });

    it("should add a widget when a widget is selected in the dashboard manager", async function() {
        await page.click('.dashboard-manager .title');

        live = await page.jQuery('.widgetpreview-categorylist>li:contains(Live!)'); // have to mouse move twice... otherwise Live! will just be highlighted
        await live.hover();
        await live.click();

        behaviour = await page.jQuery('.widgetpreview-categorylist>li:contains(Behaviour):first');
        await behaviour.hover();
        await behaviour.click();

        pages = await page.jQuery('.widgetpreview-widgetlist>li:contains(Pages):first');
        await pages.hover();
        await pages.click();

        await page.waitForNetworkIdle();

        expect(await page.screenshot({ fullPage: true })).to.matchImage('widget_add_widget');
    });

    it("should open row evolution", async function() {
        await page.waitForFunction('$("#widgetActionsgetPageUrls table.dataTable tbody tr:contains(thankyou) td:first-child").length > 0');
        var row = await page.jQuery('#widgetActionsgetPageUrls table.dataTable tbody tr:contains(thankyou) td:first-child');
        console.log(row);
        await row.hover();
console.log(1);
        const icon = await page.waitForSelector('#widgetActionsgetPageUrls table.dataTable tbody a.actionRowEvolution');
        await icon.click();
console.log(2);
        await page.waitForSelector('.ui-dialog');
        await page.waitForNetworkIdle();
console.log(3);
        const dialog = await page.$('.ui-dialog');
        expect(await dialog.screenshot()).to.matchImage('rowevolution');
    });

    it("should remove widget when remove widget icon is clicked", async function() {
        await page.click('.ui-dialog-titlebar-close'); // close row evolution

        var widget = '[id="widgetActionsgetPageUrls"]';

        titlebar = await page.$(widget + ' .widgetTop');
        await titlebar.hover();

        icon = await page.$(widget + ' .button#close');
        await icon.click();

        button = await page.jQuery('.modal.open .modal-footer a:contains(Yes)');
        await button.click();

        // page.mouseMove('.dashboard-manager');

        expect(await page.screenshot({ fullPage: true })).to.matchImage('widget_move_removed');
    });

    it("should change dashboard layout when new layout is selected", async function() {
        await page.click('.dashboard-manager .title');
        await page.click('li[data-action="showChangeDashboardLayoutDialog"]');
        await page.click('.modal.open div[layout="50-50"]');
        button = await page.jQuery('.modal.open .modal-footer a:contains(Save)');
        await button.click();

        expect(await page.screenshot({ fullPage: true })).to.matchImage('change_layout');
    });

    it("should rename dashboard when dashboard rename process completed", async function() {
        await page.click('.dashboard-manager .title');
        await page.click('li[data-action="renameDashboard"]');
        await page.type('#newDashboardName', 'newname');
        button = await page.jQuery('.modal.open .modal-footer a:contains(Save)');
        await button.click();

        expect(await page.screenshot({ fullPage: true })).to.matchImage('rename');
    });

    it("should copy dashboard successfully when copy dashboard process completed", async function() {
        await page.click('.dashboard-manager .title');
        await page.click('li[data-action="copyDashboardToUser"]');
        await page.evaluate(function () {
            $('[id=copyDashboardName]:last').val('');
        });
        await page.type('[id="copyDashboardName"]', 'newdash');
        await page.evaluate(function () {
            $('[id=copyDashboardUser]:last').val('superUserLogin');
        });
        await page.click('.modal.open .modal-footer a:contains(Ok)');

        await page.goto(url.replace("idDashboard=5", "idDashboard=6"));
        await page.waitForNetworkIdle();

        expect(await page.screenshot({ fullPage: true })).to.matchImage('copied');
    });

    it("should reset dashboard when reset dashboard process completed", async function() {
        await page.click('.dashboard-manager .title');
        await page.click('li[data-action="resetDashboard"]');
        button = await page.jQuery('.modal.open .modal-footer a:contains(Yes)');
        await button.click();
        await page.waitForNetworkIdle();

        await page.evaluate(function(){
            $('#widgetReferrersgetReferrerType').hide();
            $('#widgetReferrersgetReferrerType').offsetHeight;
            $('#widgetReferrersgetReferrerType').show();
        });

        // page.mouseMove('.dashboard-manager');

        expect(await page.screenshot({ fullPage: true })).to.matchImage('reset');
    });

    it("should remove dashboard when remove dashboard process completed", async function() {
        await page.click('.dashboard-manager .title');
        await page.click('li[data-action="removeDashboard"]');
        button = await page.jQuery('.modal.open .modal-footer a:contains(Yes)');
        await button.click();
        await page.waitForNetworkIdle();

        /* page.mouseMove('.dashboard-manager');
        page.evaluate(function () {
            $('.widgetTop').removeClass('widgetTopHover');
        });
        */

        expect(await page.screenshot({ fullPage: true })).to.matchImage('removed');
    });

    it("should not fail when default widget selection changed", async function() {
        await page.goto(url);
        await page.click('.dashboard-manager .title');
        await page.click('li[data-action="setAsDefaultWidgets"]');
        button = await page.jQuery('.modal.open .modal-footer a:contains(Yes)');
        await button.click();

        expect(await page.screenshot({ fullPage: true })).to.matchImage('default_widget_selection_changed');
    });

    it("should create new dashboard with new default widget selection when create dashboard process completed", async function() {
        await page.click('.dashboard-manager .title');
        await page.click('li[data-action="createDashboard"]');
        await page.type('#createDashboardName', 'newdash2');
        await page.click('li[data-action="setAsDefaultWidgets"]');
        button = await page.jQuery('.modal.open .modal-footer a:contains(Ok)');

        expect(await page.screenshot({ fullPage: true })).to.matchImage('create_new');
    });

    it("should load segmented dashboard", async function() {
        await removeAllExtraDashboards();
        await page.goto(url + '&segment=' + encodeURIComponent("browserCode==FF"), 5000);

        expect(await page.screenshot({ fullPage: true })).to.matchImage('segmented');
    });

    it("should load correctly with token_auth", async function() {
        testEnvironment.testUseMockAuth = 0;
        testEnvironment.save();

        var tokenAuth = "9ad1de7f8b329ab919d854c556f860c1";
        await page.goto(url.replace("idDashboard=5", "idDashboard=1") + '&token_auth=' + tokenAuth, 5000);

        expect(await page.screenshot({ fullPage: true })).to.matchImage('loaded_token_auth');
    });

    it("should fail to load with invalid token_auth", async function() {
        testEnvironment.testUseMockAuth = 0;
        testEnvironment.save();

        var tokenAuth = "anyInvalidToken";
        await page.goto(url.replace("idDashboard=5", "idDashboard=1") + '&token_auth=' + tokenAuth, 5000);

        expect(await page.screenshot({ fullPage: true })).to.matchImage('invalid_token_auth');
    });

});

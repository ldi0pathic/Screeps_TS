const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'js');
const targetDir = path.join(__dirname, 'release');

const clearTargetDir = (dir) => {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((file) => {
            const filePath = path.join(dir, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                fs.rmSync(filePath, {recursive: true, force: true});
            } else {
                fs.unlinkSync(filePath);
            }
        });
    }
};

const moveFiles = (dir, name) => {
    const items = fs.readdirSync(dir);

    items.forEach((item) => {

        const itemPath = path.join(dir, item);
        let targetPath = path.join(targetDir, item);
        if (name.length > 0) {
            targetPath = path.join(targetDir, name + '.' + item);
        }

        if (fs.lstatSync(itemPath).isDirectory()) {
            moveFiles(itemPath, item);
        } else {
            if (item.endsWith('.js')) {
                fs.renameSync(itemPath, targetPath);
            }
        }
    });
};

const fixJsCode = (dir) => {
    const items = fs.readdirSync(dir);

    items.forEach((item) => {

        const itemPath = path.join(dir, item);

        if (fs.lstatSync(itemPath).isFile() && item.endsWith('.js')) {
            let fileContent = fs.readFileSync(itemPath, 'utf8');

            fileContent = fileContent.replace(/require\(['"](.+?)['"]\)/g, (match, p1) => {

                let updatedPath = p1;

                if (updatedPath.startsWith('./') || updatedPath.startsWith('../')) {
                    updatedPath = updatedPath.replace('../', '');
                    updatedPath = updatedPath.replace('./', '');
                    const segments = updatedPath.split('/');
                    updatedPath = './' + segments.join('.');

                    if (updatedPath === './Ant') {
                        updatedPath = './ants.Ant'
                    }
                }

                return `require('${updatedPath}')`;
            });

            fileContent = fileContent.replace(/lodash_1\.default\.filter/g, 'lodash_1.filter');

            fs.writeFileSync(itemPath, fileContent, 'utf8');
        }
    });
};

if (fs.existsSync(targetDir)) {
    clearTargetDir(targetDir);
} else {
    fs.mkdirSync(targetDir);
}

moveFiles(sourceDir, '');
fixJsCode(targetDir);


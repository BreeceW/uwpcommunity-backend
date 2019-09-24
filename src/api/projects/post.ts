import { Request, Response } from "express";
import Project, { StdToDbModal_Project } from "../../models/Project";
import { checkForExistingProject, getUserFromDB, genericServerError, GetDiscordIdFromToken } from "../../common/helpers";
import UserProject from "../../models/UserProject";
import Role from "../../models/Role";
import { IUser } from "../../models/types";

module.exports = async (req: Request, res: Response) => {
    const body = req.body;

    if (!req.headers.authorization) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: "Missing authorization header"
        });
        return;
    }

    let accessToken = req.headers.authorization.replace("Bearer ", "");
    let discordId = await GetDiscordIdFromToken(accessToken, res);
    if (!discordId) return;

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        });
        return;
    }

    submitProject(body, discordId)
        .then(() => {
            res.status(200);
            res.send("Success");
        })
        .catch((err) => genericServerError(err, res));
};

function checkBody(body: IPostProjectsRequest): true | string {
    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (!body.role) return "role";
    if (body.isPrivate == undefined) return "isPrivate";
    return true;
}


function submitProject(projectRequestData: IPostProjectsRequest, discordId: any): Promise<Project> {
    return new Promise<Project>(async (resolve, reject) => {

        if (await checkForExistingProject(projectRequestData.appName).catch(reject)) {
            reject("A project with that name already exists");
            return;
        }

        // Get a matching user
        const user = await getUserFromDB(discordId).catch(reject);
        if (!user) {
            reject("User not found");
            return;
        }

        const role: Role | void | null = (await Role.findOne({ where: { name: projectRequestData.role } }).catch(reject));
        if (!role) {
            reject("Invalid role");
            return;
        }

        // Create the project
        Project.create(await StdToDbModal_Project({ ...projectRequestData }))
            .then((project) => {

                // Create the userproject
                UserProject.create(
                    {
                        userId: user.id,
                        projectId: project.id,
                        isOwner: true, // Only the project owner can create the project
                        roleId: role.id
                    })
                    .then(() => {
                        resolve(project)
                    })
                    .catch(reject);

            })
            .catch(reject);
    });
}

interface IPostProjectsRequest {
    role: "Developer" | "Translator" | "Beta Tester" | "Other";
    appName: string;
    category: string;
    description: string;
    isPrivate: boolean;
    downloadLink?: string;
    githubLink?: string;
    externalLink?: string;
    collaborators: IUser[];
    launchYear: number;
}